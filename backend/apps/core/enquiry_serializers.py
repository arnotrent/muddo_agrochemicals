from rest_framework import serializers
from apps.core.models import ContactRequest, EnquiryReply


class EnquiryReplySerializer(serializers.ModelSerializer):
    class Meta:
        model = EnquiryReply
        fields = ['id', 'author_role', 'author_name', 'kind', 'message', 'emailed', 'created_at']


class EnquirySerializer(serializers.ModelSerializer):
    """Full enquiry for staff (admin) and for the agent it was forwarded to."""
    assigned_agent_name = serializers.SerializerMethodField()
    assigned_agent_phone = serializers.SerializerMethodField()
    replies = EnquiryReplySerializer(many=True, read_only=True)

    class Meta:
        model = ContactRequest
        fields = ['id', 'ref_number', 'name', 'email', 'phone', 'subject', 'message', 'status', 'created_at',
                  'assigned_agent', 'assigned_agent_name', 'assigned_agent_phone', 'assigned_at', 'assigned_note', 'replies']
        read_only_fields = [f for f in fields if f != 'status']

    def get_assigned_agent_name(self, o):
        return o.assigned_agent.name if o.assigned_agent_id else None

    def get_assigned_agent_phone(self, o):
        return o.assigned_agent.phone if o.assigned_agent_id else None
