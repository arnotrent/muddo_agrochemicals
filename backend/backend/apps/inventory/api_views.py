from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsAdmin
from apps.inventory.models import Inventory, InventoryLog
from apps.inventory.serializers import InventorySerializer, InventoryLogSerializer, InventoryUpdateSerializer


class InventoryListView(generics.ListAPIView):
    queryset = Inventory.objects.select_related('product').order_by('product__category', 'product__name')
    serializer_class = InventorySerializer
    permission_classes = [IsAdmin]


class InventoryLogListView(generics.ListAPIView):
    queryset = InventoryLog.objects.select_related('product').order_by('-created_at')[:100]
    serializer_class = InventoryLogSerializer
    permission_classes = [IsAdmin]


@api_view(['POST'])
@permission_classes([IsAdmin])
def inventory_update_view(request):
    """
    POST /api/v1/inventory/update/
    { product_id, action: add|remove|set, qty, reorder_level?, reason? }
    """
    serializer = InventoryUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    d = serializer.validated_data

    inv, _ = Inventory.objects.get_or_create(product_id=d['product_id'], defaults={'stock_qty': 0})
    cur = inv.stock_qty
    if d['action'] == 'add':
        new_qty = cur + d['qty']
    elif d['action'] == 'remove':
        new_qty = max(0, cur - d['qty'])
    else:
        new_qty = d['qty']

    change = new_qty - cur
    inv.stock_qty = new_qty
    if 'reorder_level' in d:
        inv.reorder_level = d['reorder_level']
    inv.save()

    InventoryLog.objects.create(product_id=d['product_id'], change_qty=change,
                                 reason=d.get('reason', 'Manual update'), changed_by=request.user.username)
    return Response({'ok': True, 'new_qty': new_qty})
