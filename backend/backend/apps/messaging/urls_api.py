from django.urls import path
from apps.messaging.api_views import (
    messages_list_view, messages_send_view, messages_unread_view, messages_mark_read_view,
    admin_chat_contacts_view, agent_chat_contacts_view,
)

urlpatterns = [
    path('messages/', messages_list_view, name='api_messages_list'),
    path('messages/send/', messages_send_view, name='api_messages_send'),
    path('messages/unread/', messages_unread_view, name='api_messages_unread'),
    path('messages/mark-read/', messages_mark_read_view, name='api_messages_mark_read'),
    path('admin/chat/contacts/', admin_chat_contacts_view, name='api_admin_chat_contacts'),
    path('agent/chat/contacts/', agent_chat_contacts_view, name='api_agent_chat_contacts'),
]
