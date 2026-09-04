from django.contrib.auth.models import User
from rest_framework import serializers
from apps.agents.models import Agent
from apps.core.validators import validate_image_upload


class AgentSerializer(serializers.ModelSerializer):
    """Admin-facing list/detail — read-mostly, includes derived fields."""
    name = serializers.ReadOnlyField()
    original_name = serializers.ReadOnlyField()
    email = serializers.ReadOnlyField()
    username = serializers.ReadOnlyField()
    is_online = serializers.ReadOnlyField()
    avatar_url = serializers.ReadOnlyField()

    class Meta:
        model = Agent
        fields = ['id', 'name', 'original_name', 'display_name', 'username', 'email', 'phone',
                  'region', 'district', 'status', 'last_seen', 'created_at', 'is_online', 'avatar_url']
        read_only_fields = ['id', 'last_seen', 'created_at']


class AgentCreateSerializer(serializers.Serializer):
    """POST /api/v1/admin/agents/ — creates the underlying User + Agent together."""
    name = serializers.CharField(max_length=200)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    region = serializers.ChoiceField(choices=['Central', 'Eastern', 'Northern', 'Western'], required=False, allow_blank=True)
    district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('That username is already taken.')
        return value

    def create(self, validated_data):
        name = validated_data['name'].strip()
        first, *rest = name.split(' ', 1)
        user = User.objects.create_user(
            username=validated_data['username'], email=validated_data.get('email', '').strip(),
            password=validated_data['password'], first_name=first, last_name=' '.join(rest) if rest else '')
        agent = Agent.objects.create(
            user=user, phone=validated_data.get('phone', '').strip(),
            region=validated_data.get('region', '').strip(), district=validated_data.get('district', '').strip())
        return agent


class AgentSelfSerializer(serializers.ModelSerializer):
    """PATCH /api/v1/agents/me/ — self-service display name + avatar only."""
    name = serializers.ReadOnlyField()
    original_name = serializers.ReadOnlyField()
    avatar_url = serializers.ReadOnlyField()

    class Meta:
        model = Agent
        fields = ['display_name', 'avatar', 'avatar_url', 'name', 'original_name', 'region', 'district']
        read_only_fields = ['region', 'district', 'name', 'original_name', 'avatar_url']
        extra_kwargs = {'avatar': {'write_only': True}}

    def validate_avatar(self, value):
        if value:
            validate_image_upload(value)
        return value
