from rest_framework import serializers
from apps.requests_app.models import SupplyRequest


class SupplyRequestSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    agent_region = serializers.CharField(source='agent.region', read_only=True)

    class Meta:
        model = SupplyRequest
        fields = ['id', 'agent', 'agent_name', 'agent_region', 'product_name', 'quantity',
                  'notes', 'status', 'admin_response', 'created_at', 'updated_at']
        read_only_fields = ['id', 'agent', 'status', 'admin_response', 'created_at', 'updated_at']


class SupplyRequestRespondSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'denied'])
    response = serializers.CharField(required=False, allow_blank=True, default='')
