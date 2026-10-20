from django.db import migrations, models
import django.db.models.deletion


def mark_existing_broadcasts_seen(apps, schema_editor):
    """Old broadcasts count as already seen by everyone, so nobody gets a flood of 'unread' on upgrade."""
    Message = apps.get_model('messaging', 'Message')
    BroadcastRead = apps.get_model('messaging', 'BroadcastRead')
    Agent = apps.get_model('agents', 'Agent')
    User = apps.get_model('auth', 'User')
    readers = [(u, 'admin') for u in User.objects.filter(is_staff=True).values_list('id', flat=True)]
    readers += [(a, 'agent') for a in Agent.objects.values_list('id', flat=True)]
    batch = []
    for mid in Message.objects.filter(is_broadcast=True).values_list('id', flat=True):
        for rid, role in readers:
            batch.append(BroadcastRead(message_id=mid, reader_id=rid, reader_role=role))
        if len(batch) >= 2000:
            BroadcastRead.objects.bulk_create(batch, ignore_conflicts=True); batch = []
    if batch:
        BroadcastRead.objects.bulk_create(batch, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ('messaging', '0004_attachments_and_status'),
        ('agents', '0002_agent_display_avatar'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]
    operations = [
        migrations.CreateModel(
            name='BroadcastRead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reader_id', models.IntegerField()),
                ('reader_role', models.CharField(max_length=10)),
                ('read_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='broadcast_reads', to='messaging.message')),
            ],
        ),
        migrations.AddIndex(model_name='broadcastread', index=models.Index(fields=['reader_role', 'reader_id'], name='msg_bcast_reader_idx')),
        migrations.AlterUniqueTogether(name='broadcastread', unique_together={('message', 'reader_id', 'reader_role')}),
        migrations.RunPython(mark_existing_broadcasts_seen, migrations.RunPython.noop),
    ]
