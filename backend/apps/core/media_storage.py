"""
Persistent storage for UPLOADED PICTURES (leader photos, testimonial photos, agent / staff avatars, product images).

Why: on Render's free tier the server disk is wiped on every redeploy / respin, so every uploaded picture "disappeared
the next day" while its database row survived (the page then showed initials instead of the photo). Bytes now live in
the database (Supabase), which survives deploys. Pictures are served by apps.core.media_views.serve_media.

  * S3-compatible bucket configured (AWS_* variables)  -> settings use S3 instead and this class is not used.
  * old files still sitting on disk (MEDIA_ROOT)       -> remain readable as a fallback.
"""
import mimetypes
from urllib.parse import quote

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage, Storage


class DatabaseMediaStorage(Storage):
    def _model(self):
        from apps.core.models import MediaFile  # lazy: models import happens after app loading
        return MediaFile

    @staticmethod
    def _disk():
        return FileSystemStorage(location=str(settings.MEDIA_ROOT), base_url=settings.MEDIA_URL)

    def _open(self, name, mode='rb'):
        row = self._model().objects.filter(name=name).first()
        if row is not None:
            return ContentFile(bytes(row.data), name=name)
        disk = self._disk()
        if disk.exists(name):
            return disk.open(name, mode)
        raise FileNotFoundError(name)

    def _save(self, name, content):
        data = b''.join(content.chunks()) if hasattr(content, 'chunks') else content.read()
        ctype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
        self._model().objects.update_or_create(
            name=name, defaults={'data': data, 'size': len(data), 'content_type': ctype})
        return name

    def exists(self, name):
        return self._model().objects.filter(name=name).exists() or self._disk().exists(name)

    def delete(self, name):
        self._model().objects.filter(name=name).delete()

    def size(self, name):
        n = self._model().objects.filter(name=name).values_list('size', flat=True).first()
        return n if n is not None else self._disk().size(name)

    def url(self, name):
        return f'{settings.MEDIA_URL}{quote(name)}'

    def listdir(self, path):
        raise NotImplementedError('DatabaseMediaStorage cannot list directories.')
