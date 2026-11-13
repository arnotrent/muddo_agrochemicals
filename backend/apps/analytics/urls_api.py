from django.urls import path
from apps.analytics import api_views as v
from apps.analytics import bulk_views as b
from apps.core import twofactor_views as tf

urlpatterns = [
    path('admin/dashboard/', v.admin_dashboard_stats_view, name='api_admin_dashboard'),
    path('admin/dashboard/charts/', v.admin_analytics_charts_view, name='api_admin_dashboard_charts'),
    path('admin/products/import-csv/', b.import_products, name='api_admin_import_csv'),
    path('admin/agents/import-csv/', b.import_agents, name='api_admin_import_agents'),
    path('admin/distributors/import-csv/', b.import_distributors, name='api_admin_import_distributors'),
    # Both now require a 2FA code (see apps/core/twofactor_views.py); the old views in api_views.py are no longer routed.
    path('admin/account/change-password/', tf.change_password_view, name='api_admin_change_password'),
    path('admin/agents/reset-password/', tf.reset_agent_password_view, name='api_admin_reset_agent_password'),
    path('admin/sysinfo/', v.admin_sysinfo_view, name='api_admin_sysinfo'),
]
