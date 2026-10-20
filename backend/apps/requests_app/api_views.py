from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsAgent, IsAdmin
from apps.requests_app.models import SupplyRequest
from apps.requests_app.serializers import SupplyRequestSerializer, SupplyRequestRespondSerializer
from apps.messaging.models import Message


class MySupplyRequestListCreateView(generics.ListCreateAPIView):
    """Agent: list their own requests, create a new one."""
    serializer_class = SupplyRequestSerializer
    permission_classes = [IsAgent]

    def get_queryset(self):
        return SupplyRequest.objects.filter(agent=self.request.user.agent_profile).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(agent=self.request.user.agent_profile)


class AdminSupplyRequestListView(generics.ListAPIView):
    queryset = SupplyRequest.objects.select_related('agent__user').order_by('-created_at')
    serializer_class = SupplyRequestSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status']


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_respond_supply_view(request, pk):
    sr = get_object_or_404(SupplyRequest, pk=pk)
    serializer = SupplyRequestRespondSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    sr.status = serializer.validated_data['status']
    sr.admin_response = serializer.validated_data['response'].strip()
    sr.save()

    Message.objects.create(
        sender_id=request.user.id, sender_role='admin',
        receiver_id=sr.agent.id, receiver_role='agent',
        content=f"Your request for '{sr.product_name}' has been {sr.status}. {sr.admin_response}",
    )
    return Response(SupplyRequestSerializer(sr).data, status=status.HTTP_200_OK)
