"""
Private storage for chat attachments.

Files are NEVER placed under MEDIA_ROOT/MEDIA_URL, so there is no public URL that serves them. They are only
reachable through the authenticated / signed-link download endpoint in api_views.py.

Where the bytes live
  * S3-compatible bucket  – when the AWS_* variables are set (best for very large volumes).
  * the DATABASE          – otherwise. Render's free-tier disk is wiped on every redeploy, which silently destroyed
                            every chat attachment; the database (Supabase) survives deploys, so chat files no longer vanish.
  * old files on disk     – still readable (fallback) so nothing uploaded before this change is lost in development.

A *callable* is used (rather than a storage instance) so migrations stay stable across deployments.
"""
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage, Storage


class DatabaseStorage(Storage):
    def _model(self):
        from apps.messaging.models import StoredFile  # imported lazily: models import this module
        return StoredFile

    @staticmethod
    def _legacy():
        root = getattr(settings, 'PRIVATE_MEDIA_ROOT', settings.BASE_DIR / 'private_media')
        return FileSystemStorage(location=str(root), base_url=None)

    def _open(self, name, mode='rb'):
        row = self._model().objects.filter(name=name).first()
        if row is not None:
            return ContentFile(bytes(row.data), name=name)
        legacy = self._legacy()
        if legacy.exists(name):
            return legacy.open(name, mode)
        raise FileNotFoundError(name)

    def _save(self, name, content):
        data = b''.join(content.chunks()) if hasattr(content, 'chunks') else content.read()
        self._model().objects.update_or_create(name=name, defaults={'data': data, 'size': len(data)})
        return name

    def exists(self, name):
        return self._model().objects.filter(name=name).exists() or self._legacy().exists(name)

    def delete(self, name):
        self._model().objects.filter(name=name).delete()

    def size(self, name):
        row = self._model().objects.filter(name=name).values_list('size', flat=True).first()
        if row is not None:
            return row
        return self._legacy().size(name)

    def url(self, name):
        raise ValueError('Chat files have no public URL.')

    def listdir(self, path):
        raise NotImplementedError('DatabaseStorage cannot list directories.')


def get_private_storage():
    if getattr(settings, 'USE_S3_MEDIA', False):
        from storages.backends.s3boto3 import S3Boto3Storage
        return S3Boto3Storage(
            default_acl='private', querystring_auth=True,
            file_overwrite=False, custom_domain=None,
        )
    return DatabaseStorage()
