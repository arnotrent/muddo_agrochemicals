from django.urls import path
from apps.messaging import views
urlpatterns = [
    path('admin-panel/chat/', views.admin_chat, name='admin_chat'),
    path('api/chat/messages/', views.api_messages, name='api_chat_messages'),
    path('api/chat/send/', views.api_send, name='api_chat_send'),
    path('api/chat/unread/', views.api_unread, name='api_chat_unread'),
    path('api/chat/mark-read/', views.api_mark_read, name='api_chat_mark_read'),
    path('api/chat/typing/', views.api_typing, name='api_chat_typing'),
    path('api/chat/search/', views.api_search, name='api_chat_search'),
    path('api/chat/info/', views.api_info, name='api_chat_info'),
    path('api/chat/files/', views.api_files, name='api_chat_files'),
    path('api/chat/report/', views.api_report, name='api_chat_report'),
    path('api/chat/upload/', views.api_upload, name='api_chat_upload'),
    path('api/chat/upload/<int:aid>/delete/', views.api_upload_delete, name='api_chat_upload_delete'),
    path('api/chat/attachments/<int:aid>/file/', views.api_attachment_file, name='api_chat_attachment'),
    path('api/chat/attachments/legacy/<int:mid>/file/', views.api_legacy_attachment_file, name='api_chat_legacy_attachment'),
]
