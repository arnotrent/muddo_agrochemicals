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


# ── name / avatar lookups ────────────────────────────────────────────
# The old code ran 2-4 database queries PER MESSAGE just to print a sender's name, so opening a conversation with
# 100 messages cost hundreds of queries (that was the slow chat loading). Lookups are now memoised for the lifetime
# of one request: a conversation has two participants, so it costs two queries in total.
def _cache(request):
    if request is None:
        return {}
    cache = getattr(request, '_muddo_person_cache', None)
    if cache is None:
        cache = {}
        try:
            request._muddo_person_cache = cache
        except Exception:  # noqa: BLE001
            pass
    return cache


def _person(role, sid, request=None):
    cache = _cache(request)
    key = (role, sid)
    if key in cache:
        return cache[key]
    if role == 'admin':
        u = User.objects.select_related('staff_profile').filter(pk=sid, is_staff=True).first()
        if u:
            profile = getattr(u, 'staff_profile', None)
            out = (profile.name if profile else (u.get_full_name() or u.username),
                   profile.avatar_url if profile else None)
        else:
            out = ('Admin', None)
    else:
        a = Agent.objects.select_related('user').filter(pk=sid).first()
        out = (a.name, a.avatar_url) if a else ('Agent', None)
    cache[key] = out
    return out


def display_name(role, sid, request=None):
    return _person(role, sid, request)[0]


def avatar_url(role, sid, request=None):
    return _person(role, sid, request)[1]


def serialize_attachment(att, request):
    return {
        'id': str(att.uid), 'message_id': att.message_id, 'name': att.original_name,
        'extension': att.extension, 'mime_type': att.mime_type, 'category': att.category,
        'size': att.size, 'uploaded_by_name': display_name(att.uploaded_by_role, att.uploaded_by_id, request),
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

    def _req(self):
        return self.context.get('request')

    def get_sender_name(self, obj):
        return display_name(obj.sender_role, obj.sender_id, self._req())

    def get_sender_avatar_url(self, obj):
        return avatar_url(obj.sender_role, obj.sender_id, self._req())

    def get_reply_to_detail(self, obj):
        if not obj.reply_to_id or not obj.reply_to:
            return None
        r = obj.reply_to
        preview = r.content[:80] if r.content else ''
        if not preview and (r.attachment or r.attachments.exists()):
            preview = '\U0001F4CE Attachment'
        return {
            'id': r.id, 'sender_role': r.sender_role,
            'sender_name': display_name(r.sender_role, r.sender_id, self._req()),
            'content': preview,
        }

    def get_attachments(self, obj):
        request = self._req()
        items = [serialize_attachment(a, request) for a in obj.attachments.all()]
        if obj.attachment:  # legacy single file (public MEDIA) from before the attachment upgrade
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
                'size': None, 'uploaded_by_name': display_name(obj.sender_role, obj.sender_id, request),
                'uploaded_by_role': obj.sender_role, 'uploaded_at': obj.created_at.isoformat(),
                'url': url, 'legacy': True,
            })
        return items
