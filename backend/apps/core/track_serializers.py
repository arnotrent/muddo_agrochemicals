from rest_framework import serializers
from apps.core.models import ContactRequest

STATUS_LABEL = {'new': 'Received', 'pending': 'In progress', 'resolved': 'Resolved'}


def mask_email(value):
    local, _, domain = (value or '').partition('@')
    if not domain:
        return ''
    return f"{local[:1]}{'*' * max(2, min(len(local) - 1, 6))}@{domain}"


def mask_phone(value):
    digits = ''.join(ch for ch in (value or '') if ch.isdigit())
    return f"{'*' * 6}{digits[-3:]}" if len(digits) > 3 else ''


class ContactTrackSerializer(serializers.ModelSerializer):
    """
    PUBLIC tracking view. Anyone holding a reference number can open it, so personal data is
    masked: first name only, partially hidden e-mail/phone and only a short message preview.
    """
    name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    message_preview = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = ContactRequest
        fields = ['ref_number', 'status', 'status_label', 'subject', 'name', 'email', 'phone',
                  'message_preview', 'created_at']

    def get_name(self, o): return (o.name or '').split(' ')[0]
    def get_email(self, o): return mask_email(o.email)
    def get_phone(self, o): return mask_phone(o.phone)
    def get_status_label(self, o): return STATUS_LABEL.get(o.status, o.status.title())

    def get_message_preview(self, o):
        m = ' '.join((o.message or '').split())
        return m[:90] + ('\u2026' if len(m) > 90 else '')
