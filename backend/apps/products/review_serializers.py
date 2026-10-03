import hashlib
from django.conf import settings
from rest_framework import serializers
from apps.products.models import ProductReview


def hash_ip(ip):
    return hashlib.sha256(f'{settings.SECRET_KEY}:{ip}'.encode()).hexdigest()


class ReviewPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = ['id', 'name', 'rating', 'comment', 'created_at']


class ReviewCreateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=80)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=10, max_length=1500)
    website = serializers.CharField(required=False, allow_blank=True, default='')  # honeypot

    def validate_name(self, v):
        return ' '.join(v.split())

    def validate_comment(self, v):
        return v.strip()


class ReviewAdminSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ProductReview
        fields = ['id', 'product', 'product_name', 'name', 'rating', 'comment', 'status',
                  'created_at', 'moderated_at', 'moderated_by']
        read_only_fields = ['id', 'product', 'name', 'rating', 'comment', 'created_at',
                            'moderated_at', 'moderated_by']
