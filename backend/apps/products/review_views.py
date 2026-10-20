from datetime import timedelta

from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core import edit_tokens
from apps.core.permissions import IsAdmin
from apps.core.throttles import ReviewThrottle
from apps.products.models import Product, ProductReview
from apps.products.review_serializers import (
    ReviewPublicSerializer, ReviewCreateSerializer, ReviewAdminSerializer, ReviewRecentSerializer, hash_ip,
)


def _summary(qs):
    agg = qs.aggregate(avg=Avg('rating'), n=Count('id'))
    dist = {str(i): 0 for i in range(1, 6)}
    for row in qs.values('rating').annotate(c=Count('id')).order_by():
        dist[str(row['rating'])] = row['c']
    return {'average': round(agg['avg'], 1) if agg['avg'] else 0, 'count': agg['n'], 'distribution': dist}


class ProductReviewsView(APIView):
    """
    GET  /api/v1/products/<id>/reviews/  -> approved reviews + rating summary (public)
    POST /api/v1/products/<id>/reviews/  -> submit a review; stored 'pending'; returns an `edit_token` so the reviewer can
                                            edit / withdraw it later (public, throttled)
    """
    permission_classes = [AllowAny]

    def get_throttles(self):
        return [ReviewThrottle()] if self.request.method == 'POST' else []

    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        approved = ProductReview.objects.filter(product=product, status='approved')
        return Response({'summary': _summary(approved), 'results': ReviewPublicSerializer(approved[:50], many=True).data})

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        s = ReviewCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        ok = {'detail': 'Thank you! Your review was submitted and will appear once our team approves it.'}
        if d.get('website'):  # bot filled the hidden field — pretend success, store nothing
            return Response(ok, status=status.HTTP_201_CREATED)
        ip = hash_ip(ReviewThrottle().get_ident(request))
        if ProductReview.objects.filter(product=product, ip_hash=ip, created_at__gte=timezone.now() - timedelta(hours=24)).exists():
            return Response({'detail': 'You have already reviewed this product recently. You can edit your earlier review from "Your reviews".'},
                            status=status.HTTP_400_BAD_REQUEST)
        r = ProductReview.objects.create(product=product, name=d['name'], rating=d['rating'], comment=d['comment'], ip_hash=ip)
        return Response({**ok, 'edit_token': edit_tokens.make('product', r.pk)}, status=status.HTTP_201_CREATED)


class RecentReviewsView(APIView):
    """GET /api/v1/reviews/recent/ — newest approved product reviews across the whole catalogue (public Reviews page)."""
    permission_classes = [AllowAny]

    def get(self, request):
        approved = ProductReview.objects.filter(status='approved').select_related('product')
        return Response({'summary': _summary(approved), 'results': ReviewRecentSerializer(approved[:40], many=True).data})


class AdminReviewListView(generics.ListAPIView):
    queryset = ProductReview.objects.select_related('product').order_by('-created_at')
    serializer_class = ReviewAdminSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status', 'product']
    search_fields = ['name', 'comment', 'product__name']


class AdminReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH {status} to approve/reject, PATCH {name, rating, comment} to edit, DELETE to remove."""
    queryset = ProductReview.objects.select_related('product')
    serializer_class = ReviewAdminSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'patch', 'delete']

    def perform_update(self, serializer):
        serializer.save(moderated_at=timezone.now(), moderated_by=self.request.user.username)
