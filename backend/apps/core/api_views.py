import logging
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import ContactRequest, NewsletterSubscriber, SiteSettings, FAQ, StaffProfile
from apps.core.notify import company_recipients, company_contact_line
from apps.core.permissions import IsAdmin, IsAdminOrReadOnly
from apps.core.serializers import (
    ContactRequestSerializer, ContactRequestAdminSerializer, NewsletterSubscriberSerializer,
    SiteSettingsSerializer, FAQSerializer, StaffProfileSerializer,
)
from apps.core.throttles import ContactThrottle, NewsletterThrottle, TrackThrottle
from apps.core.track_serializers import ContactTrackSerializer
from apps.core.validators import validate_image_upload

logger = logging.getLogger('django.request')


def _send(subj, to, body):
    try:
        send_mail(subj, body, settings.DEFAULT_FROM_EMAIL, to, fail_silently=True)
    except Exception:
        logger.exception('Could not send e-mail "%s"', subj)


# ── Public: Contact ────────────────────────────────────────────────
class ContactCreateView(generics.CreateAPIView):
    """POST /api/v1/contact/ — public enquiry form."""
    queryset = ContactRequest.objects.all()
    serializer_class = ContactRequestSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ContactThrottle]

    def perform_create(self, serializer):
        cr = serializer.save()
        site = SiteSettings.load()
        _send(f'Muddo Agro \u2014 Enquiry Received [{cr.ref_number}]', [cr.email],
              f"Dear {cr.name},\n\nThank you for contacting Muddo Agro Chemicals LTD.\n"
              f"Your reference: {cr.ref_number}\n"
              f"You can follow its progress any time on our website: Track Enquiry.\n\n"
              f"We'll respond within 1 business day.\n\nMuddo Agro Team\n{company_contact_line()}")
        _send(f'New Enquiry [{cr.ref_number}] \u2014 {cr.subject}', company_recipients(site),
              f"From: {cr.name} <{cr.email}>\nPhone: {cr.phone}\nSubject: {cr.subject}\n\n{cr.message}")


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@throttle_classes([TrackThrottle])
def track_enquiry_view(request):
    """GET /api/v1/contact/track/?ref=ENQ-XXXXXXXX — masked, throttled."""
    ref = (request.GET.get('ref') or '').strip().upper()
    if not ref:
        return Response({'detail': 'A reference number is required.'}, status=400)
    if len(ref) > 20:
        return Response({'found': False})
    cr = ContactRequest.objects.filter(ref_number=ref).first()
    if not cr:
        return Response({'found': False})
    return Response({'found': True, 'result': ContactTrackSerializer(cr).data})


class AdminContactListView(generics.ListAPIView):
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
@throttle_classes([NewsletterThrottle])
def subscribe_view(request):
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


# ── FAQ + Site settings ────────────────────────────────────────────
class FAQListView(generics.ListAPIView):
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
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load()).data)

    def patch(self, request):
        site = SiteSettings.load()
        serializer = SiteSettingsSerializer(site, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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
