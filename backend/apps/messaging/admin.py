from django.contrib import admin
from .models import Message, MessageAttachment


class AttachmentInline(admin.TabularInline):
    model = MessageAttachment
    extra = 0
    readonly_fields = ['uid', 'original_name', 'mime_type', 'size', 'uploaded_at']
    exclude = ['file']
    can_delete = True


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender_role', 'sender_id', 'receiver_role', 'receiver_id', 'read', 'created_at']
    list_filter = ['sender_role', 'read']
    inlines = [AttachmentInline]
