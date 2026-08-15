from django.db import models

class Message(models.Model):
    ROLES=[('admin','Admin'),('agent','Agent')]
    sender_id=models.IntegerField(); sender_role=models.CharField(max_length=10,choices=ROLES)
    receiver_id=models.IntegerField(); receiver_role=models.CharField(max_length=10,choices=ROLES)
    content=models.TextField(blank=True)
    read=models.BooleanField(default=False)
    is_broadcast=models.BooleanField(default=False)
    reply_to=models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    attachment=models.FileField(upload_to='chat_attachments/%Y/%m/', blank=True, null=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta: ordering=['created_at']
    def __str__(self): return f"[{self.sender_role}→{self.receiver_role}] {self.content[:40] or '[attachment]'}"

    IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')

    @property
    def attachment_is_image(self):
        if not self.attachment: return False
        return self.attachment.name.lower().endswith(self.IMAGE_EXTS)
