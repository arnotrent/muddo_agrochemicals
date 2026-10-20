from rest_framework import serializers
from apps.inventory.models import Inventory, InventoryLog


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    is_low = serializers.ReadOnlyField()
    status = serializers.ReadOnlyField()

    class Meta:
        model = Inventory
        fields = ['id', 'product', 'product_name', 'product_category', 'stock_qty',
                  'reorder_level', 'unit', 'last_updated', 'is_low', 'status']
        read_only_fields = ['id', 'last_updated']


class InventoryLogSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = InventoryLog
        fields = ['id', 'product', 'product_name', 'change_qty', 'reason', 'changed_by', 'created_at']
        read_only_fields = ['id', 'created_at']


class InventoryUpdateSerializer(serializers.Serializer):
    """Mirrors the original admin_update_inventory action-based endpoint."""
    product_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=['add', 'remove', 'set'], default='set')
    qty = serializers.IntegerField(min_value=0)
    reorder_level = serializers.IntegerField(min_value=0, required=False)
    reason = serializers.CharField(required=False, allow_blank=True, default='Manual update')
