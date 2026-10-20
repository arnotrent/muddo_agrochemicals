from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.models import ContactRequest, NewsletterSubscriber, SiteSettings, FAQ, StaffProfile
from apps.core.permissions import IsAdmin, IsAdminOrReadOnly
from apps.core.serializers import (
    ContactRequestSerializer, ContactRequestAdminSerializer, NewsletterSubscriberSerializer,
    SiteSettingsSerializer, FAQSerializer, StaffProfileSerializer,
)
from apps.core.validators import validate_image_upload


def _send(subj, to, body):
    try:
        send_mail(subj, body, settings.DEFAULT_FROM_EMAIL, to, fail_silently=True)
    except Exception:
        pass


# ── Public: Contact ────────────────────────────────────────────────
class ContactCreateView(generics.CreateAPIView):
    """POST /api/v1/contact/ — public enquiry form."""
    queryset = ContactRequest.objects.all()
    serializer_class = ContactRequestSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'

    def perform_create(self, serializer):
        cr = serializer.save()
        site = SiteSettings.load()
        _send(f'Muddo Agro \u2014 Enquiry Received [{cr.ref_number}]', [cr.email],
              f"Dear {cr.name},\n\nThank you for contacting Muddo Agro Chemicals LTD.\n"
              f"Your reference: {cr.ref_number}\n\nWe'll respond within 1 business day.\n\n"
              f"Muddo Agro Team\n{site.company_phone}")
        _send(f'New Enquiry [{cr.ref_number}] \u2014 {cr.subject}', [site.company_email],
              f"From: {cr.name} <{cr.email}>\nPhone: {cr.phone}\nSubject: {cr.subject}\n\n{cr.message}")


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def track_enquiry_view(request):
    """GET /api/v1/contact/track/?ref=ENQ-XXXX"""
    ref = (request.GET.get('ref') or '').strip().upper()
    if not ref:
        return Response({'detail': 'A reference number is required.'}, status=400)
    try:
        cr = ContactRequest.objects.get(ref_number=ref)
    except ContactRequest.DoesNotExist:
        return Response({'found': False})
    return Response({'found': True, 'result': ContactRequestSerializer(cr).data})


class AdminContactListView(generics.ListAPIView):
    """GET /api/v1/admin/contact-requests/ — staff only."""
    queryset = ContactRequest.objects.order_by('-created_at')
    serializer_class = ContactRequestAdminSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status']
    search_fields = ['name', 'email', 'subject']


class AdminContactUpdateView(generics.UpdateAPIView):
    queryset = ContactRequest.objects.all()
    serializer_class = ContactRequestAdminSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['patch']


# ── Public: Newsletter ─────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([ScopedRateThrottle])
def subscribe_view(request):
    subscribe_view.throttle_scope = 'newsletter'
    serializer = NewsletterSubscriberSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    obj, created = NewsletterSubscriber.objects.get_or_create(
        email=email, defaults={'name': serializer.validated_data.get('name', ''), 'active': True})
    if not created and obj.active:
        return Response({'ok': True, 'message': 'Already subscribed!'})
    if not created:
        obj.active = True
        obj.save(update_fields=['active'])
    return Response({'ok': True, 'message': "Subscribed! You'll receive our latest updates."}, status=status.HTTP_201_CREATED)


class AdminNewsletterListView(generics.ListAPIView):
    queryset = NewsletterSubscriber.objects.order_by('-subscribed_at')
    serializer_class = NewsletterSubscriberSerializer
    permission_classes = [IsAdmin]


# ── Public: FAQ + Site settings ────────────────────────────────────
class FAQListView(generics.ListAPIView):
    """Public GET returns only active FAQs; admins get everything + write access via AdminFAQViewSet."""
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return FAQ.objects.all() if (self.request.user.is_authenticated and self.request.user.is_staff) else FAQ.objects.filter(active=True)


class AdminFAQDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [IsAdmin]


class AdminFAQCreateView(generics.CreateAPIView):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        serializer.save(order=FAQ.objects.count())


class SiteSettingsView(APIView):
    """GET is public (footer/about/contact need it); PATCH is admin-only."""
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load()).data)

    def patch(self, request):
        site = SiteSettings.load()
        serializer = SiteSettingsSerializer(site, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Staff self-service profile ─────────────────────────────────────
class MyStaffProfileView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        profile, _ = StaffProfile.objects.get_or_create(user=request.user)
        return Response(StaffProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = StaffProfile.objects.get_or_create(user=request.user)
        if 'avatar' in request.FILES:
            validate_image_upload(request.FILES['avatar'])
        serializer = StaffProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Public: global search across products + distributors ──────────
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def global_search_view(request):
    from apps.products.models import Product
    from apps.products.serializers import ProductListSerializer
    from apps.distributors.models import Distributor
    from apps.distributors.serializers import DistributorSerializer

    q = (request.GET.get('q') or '').strip()
    if len(q) < 2:
        return Response({'q': q, 'products': [], 'distributors': []})

    products = (Product.objects.filter(name__icontains=q) | Product.objects.filter(active_ingredient__icontains=q) |
                Product.objects.filter(crops__icontains=q) | Product.objects.filter(description__icontains=q)).distinct()[:20]
    distributors = (Distributor.objects.filter(name__icontains=q) | Distributor.objects.filter(district__icontains=q) |
                     Distributor.objects.filter(region__icontains=q)).distinct()[:10]

    return Response({
        'q': q,
        'products': ProductListSerializer(products, many=True, context={'request': request}).data,
        'distributors': DistributorSerializer(distributors, many=True).data,
    })
