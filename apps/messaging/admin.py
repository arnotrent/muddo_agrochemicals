from django.contrib import admin
from .models import Message, Attachment


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0
    readonly_fields = ['original_filename', 'file_extension', 'mime_type', 'file_size', 'uploaded_by_id', 'uploaded_by_role', 'uploaded_at']
    exclude = ['file']
    can_delete = True


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender_role', 'sender_id', 'receiver_role', 'receiver_id', 'delivered', 'read', 'created_at']
    list_filter = ['sender_role', 'read', 'delivered']
    inlines = [AttachmentInline]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'mime_type', 'file_size', 'uploaded_by_role', 'uploaded_at', 'message']
    list_filter = ['uploaded_by_role', 'file_extension']
    search_fields = ['original_filename']
    exclude = ['file']
    readonly_fields = ['original_filename', 'file_extension', 'mime_type', 'file_size', 'uploaded_by_id', 'uploaded_by_role', 'uploaded_at', 'message']
