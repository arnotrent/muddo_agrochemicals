from django.core import signing
from django.urls import reverse
from rest_framework import serializers

from apps.messaging.models import Message, MessageAttachment
from django.contrib.auth.models import User
from apps.agents.models import Agent

LINK_SALT = 'muddo-chat-attachment'
LINK_MAX_AGE = 60 * 60  # signed links live one hour; the client re-requests on demand


def make_token(uid):
    return signing.TimestampSigner(salt=LINK_SALT).sign(str(uid))


def token_is_valid(uid, token):
    try:
        return signing.TimestampSigner(salt=LINK_SALT).unsign(token, max_age=LINK_MAX_AGE) == str(uid)
    except signing.BadSignature:
        return False


def attachment_url(request, uid):
    path = reverse('api_attachment_download', args=[uid]) + f'?t={make_token(uid)}'
    return request.build_absolute_uri(path) if request else path


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


def serialize_attachment(att, request):
    return {
        'id': str(att.uid), 'message_id': att.message_id, 'name': att.original_name,
        'extension': att.extension, 'mime_type': att.mime_type, 'category': att.category,
        'size': att.size, 'uploaded_by_name': display_name(att.uploaded_by_role, att.uploaded_by_id),
        'uploaded_by_role': att.uploaded_by_role, 'uploaded_at': att.uploaded_at.isoformat(),
        'url': attachment_url(request, att.uid),
    }


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar_url = serializers.SerializerMethodField()
    reply_to_detail = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    status = serializers.ReadOnlyField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender_id', 'sender_role', 'sender_name', 'sender_avatar_url',
            'receiver_id', 'receiver_role', 'content', 'read', 'is_broadcast',
            'reply_to', 'reply_to_detail', 'attachments', 'status',
            'delivered_at', 'read_at', 'created_at',
        ]
        read_only_fields = fields

    def get_sender_name(self, obj):
        return display_name(obj.sender_role, obj.sender_id)

    def get_sender_avatar_url(self, obj):
        return avatar_url(obj.sender_role, obj.sender_id)

    def get_reply_to_detail(self, obj):
        if not obj.reply_to_id or not obj.reply_to:
            return None
        r = obj.reply_to
        has_att = r.attachments.exists() or bool(r.attachment)
        return {
            'id': r.id, 'sender_role': r.sender_role, 'sender_name': display_name(r.sender_role, r.sender_id),
            'content': (r.content[:80] if r.content else ('\U0001F4CE Attachment' if has_att else '')),
        }

    def get_attachments(self, obj):
        request = self.context.get('request')
        items = [serialize_attachment(a, request) for a in obj.attachments.all()]
        if obj.attachment:  # legacy single file (public MEDIA) from before this upgrade
            name = obj.attachment.name.rsplit('/', 1)[-1]
            ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
            try:
                url = obj.attachment.url
                url = request.build_absolute_uri(url) if request else url
            except ValueError:
                url = None
            items.append({
                'id': f'legacy-{obj.pk}', 'message_id': obj.pk, 'name': name, 'extension': ext,
                'mime_type': '', 'category': 'image' if obj.attachment_is_image else 'document',
                'size': None, 'uploaded_by_name': display_name(obj.sender_role, obj.sender_id),
                'uploaded_by_role': obj.sender_role, 'uploaded_at': obj.created_at.isoformat(),
                'url': url, 'legacy': True,
            })
        return items
