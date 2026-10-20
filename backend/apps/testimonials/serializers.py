from rest_framework import serializers

from apps.core.image_utils import sanitize_image
from apps.testimonials.models import Testimonial


def _photo_url(obj, request):
    path = obj.photo_path
    return request.build_absolute_uri(path) if (path and request) else path


class TestimonialPublicSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)

    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'role', 'message', 'rating', 'photo_url', 'product', 'product_name', 'created_at']

    def get_photo_url(self, obj):
        return _photo_url(obj, self.context.get('request'))


class TestimonialSubmitSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=80)
    role = serializers.CharField(required=False, allow_blank=True, max_length=120, default='')
    message = serializers.CharField(min_length=15, max_length=1000)
    rating = serializers.IntegerField(required=False, min_value=1, max_value=5, allow_null=True, default=None)
    product = serializers.IntegerField(required=False, allow_null=True, default=None)
    photo = serializers.ImageField(required=False, allow_null=True, default=None)
    website = serializers.CharField(required=False, allow_blank=True, default='')  # honeypot

    def validate_name(self, v):
        return ' '.join(v.split())

    def validate_role(self, v):
        return ' '.join(v.split())

    def validate_message(self, v):
        return v.strip()

    def validate_photo(self, v):
        return sanitize_image(v, max_side=480, name_prefix='t') if v else None


class TestimonialAdminSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)
    remove_photo = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'role', 'message', 'rating', 'photo', 'photo_url', 'remove_photo', 'product',
                  'product_name', 'status', 'source', 'order', 'created_at', 'moderated_at', 'moderated_by']
        read_only_fields = ['id', 'source', 'created_at', 'moderated_at', 'moderated_by']
        extra_kwargs = {'photo': {'write_only': True, 'required': False}}

    def get_photo_url(self, obj):
        return _photo_url(obj, self.context.get('request'))

    def validate_photo(self, v):
        return sanitize_image(v, max_side=480, name_prefix='t') if v else None

    def validate_message(self, v):
        return v.strip()

    def update(self, instance, validated_data):
        if validated_data.pop('remove_photo', False) and instance.photo:
            instance.photo.delete(save=False)
            instance.photo = None
        return super().update(instance, validated_data)

    def create(self, validated_data):
        validated_data.pop('remove_photo', None)
        return super().create(validated_data)
