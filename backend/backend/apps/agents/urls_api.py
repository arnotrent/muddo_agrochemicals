from django.urls import path
from apps.agents.api_views import (
    AdminAgentListCreateView, AdminAgentDeleteView, admin_toggle_agent_view,
    MyAgentProfileView, agents_status_view, agent_report_pdf_view,
)

urlpatterns = [
    path('agents/me/', MyAgentProfileView.as_view(), name='api_agent_me'),
    path('agents/status/', agents_status_view, name='api_agents_status'),

    path('admin/agents/', AdminAgentListCreateView.as_view(), name='api_admin_agents'),
    path('admin/agents/<int:pk>/', AdminAgentDeleteView.as_view(), name='api_admin_agent_delete'),
    path('admin/agents/<int:pk>/toggle/', admin_toggle_agent_view, name='api_admin_agent_toggle'),
    path('admin/agents/<int:pk>/report/', agent_report_pdf_view, name='api_agent_report'),
]
