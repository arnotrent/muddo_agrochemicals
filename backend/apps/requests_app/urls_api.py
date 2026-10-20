from django.urls import path
from apps.requests_app.api_views import (
    MySupplyRequestListCreateView, AdminSupplyRequestListView, admin_respond_supply_view,
)

urlpatterns = [
    path('supply-requests/', MySupplyRequestListCreateView.as_view(), name='api_my_supply_requests'),
    path('admin/supply-requests/', AdminSupplyRequestListView.as_view(), name='api_admin_supply_requests'),
    path('admin/supply-requests/<int:pk>/respond/', admin_respond_supply_view, name='api_admin_respond_supply'),
]
