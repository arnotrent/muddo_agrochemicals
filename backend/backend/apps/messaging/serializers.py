from rest_framework import serializers
from apps.messaging.models import Message
from django.contrib.auth.models import User
from apps.agents.models import Agent


def display_name(role, sid):
    if role == 'admin':
        u = User.objects.filter(pk=sid, is_staff=True).first()
        if u:
            profile = getattr(u, 'staff_profile', None)
            return profile.name if profile else (u.get_full_name() or u.username)
        return 'Admin'
    a = Agent.objects.filter(pk=sid).first()
    return a.name if a else 'Agent'


def avatar_url(role, sid):
    if role == 'admin':
        u = User.objects.filter(pk=sid).first()
        profile = getattr(u, 'staff_profile', None) if u else None
        return profile.avatar_url if profile else None
    a = Agent.objects.filter(pk=sid).first()
    return a.avatar_url if a else None


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar_url = serializers.SerializerMethodField()
    reply_to_detail = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    attachment_name = serializers.SerializerMethodField()
    attachment_is_image = serializers.ReadOnlyField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender_id', 'sender_role', 'sender_name', 'sender_avatar_url',
            'receiver_id', 'receiver_role', 'content', 'read', 'is_broadcast',
            'reply_to', 'reply_to_detail', 'attachment', 'attachment_url', 'attachment_name',
            'attachment_is_image', 'created_at',
        ]
        read_only_fields = ['id', 'sender_id', 'sender_role', 'read', 'created_at']
        extra_kwargs = {'attachment': {'write_only': True, 'required': False}}

    def get_sender_name(self, obj):
        return display_name(obj.sender_role, obj.sender_id)

    def get_sender_avatar_url(self, obj):
        return avatar_url(obj.sender_role, obj.sender_id)

    def get_reply_to_detail(self, obj):
        if not obj.reply_to_id or not obj.reply_to:
            return None
        r = obj.reply_to
        return {
            'id': r.id, 'sender_role': r.sender_role, 'sender_name': display_name(r.sender_role, r.sender_id),
            'content': (r.content[:80] if r.content else ('\U0001F4CE Attachment' if r.attachment else '')),
        }

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url

    def get_attachment_name(self, obj):
        return obj.attachment.name.rsplit('/', 1)[-1] if obj.attachment else None

    def validate(self, attrs):
        if not attrs.get('content') and not attrs.get('attachment') and not self.initial_data.get('attachment'):
            raise serializers.ValidationError('A message needs text or an attachment.')
        return attrs
