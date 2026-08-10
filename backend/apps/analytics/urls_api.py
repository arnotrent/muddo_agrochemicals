from django.urls import path
from apps.analytics import api_views as v

urlpatterns = [
    path('admin/dashboard/', v.admin_dashboard_stats_view, name='api_admin_dashboard'),
    path('admin/dashboard/charts/', v.admin_analytics_charts_view, name='api_admin_dashboard_charts'),
    path('admin/products/import-csv/', v.admin_import_csv_view, name='api_admin_import_csv'),
    path('admin/account/change-password/', v.admin_change_password_view, name='api_admin_change_password'),
    path('admin/agents/reset-password/', v.admin_reset_agent_password_view, name='api_admin_reset_agent_password'),
    path('admin/sysinfo/', v.admin_sysinfo_view, name='api_admin_sysinfo'),
]
