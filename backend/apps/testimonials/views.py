from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.permissions import IsAdmin
from apps.core.throttles import TestimonialThrottle
from apps.products.models import Product
from apps.products.review_serializers import hash_ip
from apps.testimonials.models import Testimonial
from apps.testimonials.serializers import (
    TestimonialPublicSerializer, TestimonialSubmitSerializer, TestimonialAdminSerializer,
)


class PublicTestimonialList(generics.ListAPIView):
    """GET /api/v1/testimonials/ — approved testimonials only."""
    serializer_class = TestimonialPublicSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Testimonial.objects.filter(status='approved').select_related('product')[:48]


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([TestimonialThrottle])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def submit_testimonial_view(request):
    """POST /api/v1/testimonials/submit/ — public; stored 'pending' until approved; the admin alone decides what is shown."""
    s = TestimonialSubmitSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    ok = {'detail': 'Thank you for your feedback! Our team reads every review.'}
    if d.get('website'):  # honeypot
        return Response(ok, status=status.HTTP_201_CREATED)
    ip = hash_ip(TestimonialThrottle().get_ident(request))
    if Testimonial.objects.filter(ip_hash=ip, created_at__gte=timezone.now() - timedelta(hours=12)).count() >= 2:
        return Response({'detail': 'You have already shared your experience recently. Thank you!'}, status=400)
    product = Product.objects.filter(pk=d['product']).first() if d.get('product') else None
    t = Testimonial(name=d['name'], role=d['role'], message=d['message'], rating=d['rating'],
                    product=product, status='pending', source='public', ip_hash=ip)
    if d.get('photo'):
        t.photo.save(d['photo'].name, d['photo'], save=False)
    t.save()
    return Response(ok, status=status.HTTP_201_CREATED)


class AdminTestimonialList(generics.ListCreateAPIView):
    queryset = Testimonial.objects.select_related('product').order_by('-created_at')
    serializer_class = TestimonialAdminSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['status']
    search_fields = ['name', 'message', 'role']

    def perform_create(self, serializer):
        serializer.save(source='admin', status=serializer.validated_data.get('status', 'approved'),
                        moderated_at=timezone.now(), moderated_by=self.request.user.username)


class AdminTestimonialDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Testimonial.objects.select_related('product')
    serializer_class = TestimonialAdminSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ['get', 'patch', 'delete']

    def perform_update(self, serializer):
        serializer.save(moderated_at=timezone.now(), moderated_by=self.request.user.username)

    def perform_destroy(self, instance):
        if instance.photo:
            instance.photo.delete(save=False)
        instance.delete()
