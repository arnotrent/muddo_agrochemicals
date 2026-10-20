from rest_framework import serializers
from apps.core.image_utils import sanitize_image
from apps.leadership.models import Leader


class DefaultTrueBoolean(serializers.BooleanField):
    """DRF reads a missing checkbox in a multipart form as False even with default=True; this keeps the default."""
    default_empty_html = serializers.empty


class LeaderSerializer(serializers.ModelSerializer):
    active = DefaultTrueBoolean(required=False, default=True)
    photo_url = serializers.SerializerMethodField()
    remove_photo = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Leader
        fields = ['id', 'name', 'title', 'bio', 'greeting', 'photo', 'remove_photo', 'photo_url', 'order', 'active']
        extra_kwargs = {'photo': {'write_only': True, 'required': False}}

    def get_photo_url(self, obj):
        path = obj.photo_path
        request = self.context.get('request')
        return request.build_absolute_uri(path) if (path and request) else path

    def validate_photo(self, value):
        return sanitize_image(value, max_side=900, name_prefix='leader') if value else None

    def update(self, instance, validated_data):
        if validated_data.pop('remove_photo', False) and instance.photo:
            instance.photo.delete(save=False)
            instance.photo = None
        return super().update(instance, validated_data)

    def create(self, validated_data):
        validated_data.pop('remove_photo', None)
        return super().create(validated_data)
