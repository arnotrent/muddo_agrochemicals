import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0004_seed_site_content'),
        ('agents', '0002_agent_display_avatar'),
    ]
    operations = [
        migrations.AddField(model_name='contactrequest', name='assigned_agent',
                            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                                    related_name='assigned_enquiries', to='agents.agent')),
        migrations.AddField(model_name='contactrequest', name='assigned_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='contactrequest', name='assigned_note', field=models.TextField(blank=True)),
        migrations.CreateModel(
            name='EnquiryReply',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('author_role', models.CharField(max_length=10)),
                ('author_name', models.CharField(max_length=150)),
                ('kind', models.CharField(choices=[('reply', 'Reply to customer'), ('forward', 'Forwarded to agent'), ('note', 'Internal note')], default='reply', max_length=10)),
                ('message', models.TextField()),
                ('emailed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('enquiry', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='core.contactrequest')),
            ],
            options={'ordering': ['created_at', 'id']},
        ),
    ]
