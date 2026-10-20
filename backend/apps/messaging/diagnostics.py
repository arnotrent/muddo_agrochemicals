"""Self-checks for the chat system. Used by the admin banner and `manage.py check_chat`."""
import uuid

from django.conf import settings
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor


def _check(name, ok, detail, fix='', level='error'):
    return {'name': name, 'ok': bool(ok), 'detail': detail, 'fix': fix, 'level': level}


def run_checks():
    from apps.messaging.models import Message
    from apps.messaging.storage import get_private_storage
    out = []

    # 1. migrations applied
    try:
        ex = MigrationExecutor(connection)
        applied = ('messaging', '0004_attachments_and_status') in ex.loader.applied_migrations
        out.append(_check('Database migrations', applied,
                          'Chat attachment tables are present.' if applied else 'Migration messaging.0004 has NOT been applied.',
                          'Run: python manage.py migrate   (Render: redeploy — the build command runs it).'))
    except Exception as e:
        out.append(_check('Database migrations', False, f'Could not inspect migrations: {e}', 'Check DATABASE_URL.'))

    # 2. columns/tables really exist
    try:
        tables = connection.introspection.table_names()
        with connection.cursor() as c:
            cols = {col.name for col in connection.introspection.get_table_description(c, Message._meta.db_table)}
        ok = 'messaging_messageattachment' in tables and {'delivered_at', 'read_at'} <= cols
        out.append(_check('Chat tables & columns', ok, 'OK' if ok else 'Chat columns/tables are missing in the database.',
                          'Run: python manage.py migrate'))
    except Exception as e:
        out.append(_check('Chat tables & columns', False, str(e), 'Run: python manage.py migrate'))

    # 3. a real insert, rolled back
    try:
        with transaction.atomic():
            Message.objects.create(sender_id=0, sender_role='admin', receiver_id=0, receiver_role='agent',
                                   content='diagnostic')
            transaction.set_rollback(True)
        out.append(_check('Saving a message', True, 'A test message could be saved (and was rolled back).'))
    except Exception as e:
        out.append(_check('Saving a message', False, f'{type(e).__name__}: {e}'[:300], 'Run: python manage.py migrate'))

    # 4. private file storage writable
    try:
        st = get_private_storage()
        probe = f'chat/_probe_{uuid.uuid4().hex}.txt'
        from django.core.files.base import ContentFile
        name = st.save(probe, ContentFile(b'ok'))
        st.delete(name)
        out.append(_check('Attachment storage', True, 'Private storage is writable.'))
    except Exception as e:
        out.append(_check('Attachment storage', False, f'{type(e).__name__}: {e}'[:300],
                          'Check the AWS_* / Supabase storage variables, or disk permissions.'))

    # 5. persistence warning
    s3 = getattr(settings, 'USE_S3_MEDIA', False)
    out.append(_check('Attachment persistence', s3 or settings.DEBUG,
                      'Files are stored in S3-compatible storage.' if s3 else
                      'Files are stored on the server disk. On Render\'s free tier that disk is wiped on every redeploy.',
                      'Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_STORAGE_BUCKET_NAME (+ AWS_S3_ENDPOINT_URL for Supabase).',
                      level='warn'))
    return out
