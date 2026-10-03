from rest_framework import serializers
from apps.core.validators import validate_image_upload
from apps.leadership.models import Leader


class LeaderSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Leader
        fields = ['id', 'name', 'title', 'bio', 'photo', 'photo_url', 'order', 'active']
        extra_kwargs = {'photo': {'write_only': True, 'required': False}}

    def get_photo_url(self, obj):
        path = obj.photo_path
        request = self.context.get('request')
        return request.build_absolute_uri(path) if (path and request) else path

    def validate_photo(self, value):
        if value:
            validate_image_upload(value)
        return value
