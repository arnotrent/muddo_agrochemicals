from django.urls import path
from apps.inventory.api_views import InventoryListView, InventoryLogListView, inventory_update_view

urlpatterns = [
    path('inventory/', InventoryListView.as_view(), name='api_inventory_list'),
    path('inventory/logs/', InventoryLogListView.as_view(), name='api_inventory_logs'),
    path('inventory/update/', inventory_update_view, name='api_inventory_update'),
]
