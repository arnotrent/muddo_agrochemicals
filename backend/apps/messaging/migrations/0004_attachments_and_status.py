import uuid
import apps.messaging.models
import apps.messaging.storage
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('messaging', '0003_message_reply_attachment')]
    operations = [
        migrations.AddField(model_name='message', name='delivered_at',
                            field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='message', name='read_at',
                            field=models.DateTimeField(blank=True, null=True)),
        migrations.CreateModel(
            name='MessageAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uid', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('file', models.FileField(max_length=255, storage=apps.messaging.storage.get_private_storage,
                                          upload_to=apps.messaging.models.attachment_path)),
                ('original_name', models.CharField(max_length=255)),
                ('extension', models.CharField(max_length=10)),
                ('mime_type', models.CharField(max_length=120)),
                ('category', models.CharField(max_length=20)),
                ('size', models.BigIntegerField()),
                ('uploaded_by_id', models.IntegerField()),
                ('uploaded_by_role', models.CharField(max_length=10)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                              related_name='attachments', to='messaging.message')),
            ],
            options={'ordering': ['id']},
        ),
    ]
