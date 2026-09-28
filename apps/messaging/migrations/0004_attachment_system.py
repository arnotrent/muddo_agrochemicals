from django.db import migrations, models
import django.db.models.deletion
import apps.messaging.storage
import apps.messaging.models


class Migration(migrations.Migration):
    dependencies = [('messaging', '0003_message_reply_attachment')]
    operations = [
        migrations.AddField(model_name='message', name='client_id', field=models.CharField(blank=True, db_index=True, max_length=64, default='')),
        migrations.AddField(model_name='message', name='delivered', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='message', name='delivered_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='message', name='read_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.CreateModel(
            name='Attachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(max_length=255, storage=apps.messaging.storage.private_attachment_storage, upload_to=apps.messaging.models.attachment_path)),
                ('original_filename', models.CharField(max_length=255)),
                ('file_extension', models.CharField(blank=True, max_length=16)),
                ('mime_type', models.CharField(max_length=120)),
                ('file_size', models.BigIntegerField()),
                ('uploaded_by_id', models.IntegerField()),
                ('uploaded_by_role', models.CharField(choices=[('admin', 'Admin'), ('agent', 'Agent')], max_length=10)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='messaging.message')),
            ],
            options={'ordering': ['uploaded_at', 'id']},
        ),
    ]
