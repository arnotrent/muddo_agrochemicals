import uuid
from django.db import models
from django.utils import timezone

from apps.messaging.storage import get_private_storage


def attachment_path(instance, filename):
    # Unguessable storage name; the human filename lives in `original_name`.
    ext = (instance.extension or 'bin').lower()
    return f'chat/{timezone.now():%Y/%m}/{instance.uid.hex}.{ext}'


class Message(models.Model):
    ROLES = [('admin', 'Admin'), ('agent', 'Agent')]
    sender_id = models.IntegerField()
    sender_role = models.CharField(max_length=10, choices=ROLES)
    receiver_id = models.IntegerField()
    receiver_role = models.CharField(max_length=10, choices=ROLES)
    content = models.TextField(blank=True)
    read = models.BooleanField(default=False)
    is_broadcast = models.BooleanField(default=False)
    reply_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    # LEGACY single attachment (public MEDIA). New uploads use MessageAttachment.
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/', blank=True, null=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender_role}→{self.receiver_role}] {self.content[:40] or '[attachment]'}"

    IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')

    @property
    def attachment_is_image(self):
        if not self.attachment:
            return False
        return self.attachment.name.lower().endswith(self.IMAGE_EXTS)

    @property
    def status(self):
        if self.read:
            return 'read'
        if self.delivered_at:
            return 'delivered'
        return 'sent'


class MessageAttachment(models.Model):
    uid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to=attachment_path, storage=get_private_storage, max_length=255)
    original_name = models.CharField(max_length=255)
    extension = models.CharField(max_length=10)
    mime_type = models.CharField(max_length=120)
    category = models.CharField(max_length=20)
    size = models.BigIntegerField()
    uploaded_by_id = models.IntegerField()
    uploaded_by_role = models.CharField(max_length=10)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.original_name

    @property
    def storage_path(self):
        return self.file.name
