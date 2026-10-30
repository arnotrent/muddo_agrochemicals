"""
Persistent storage for UPLOADED PICTURES (leader photos, testimonial photos, agent / staff avatars, product images).

Bytes live in the database (Supabase) because Render's disk is wiped on redeploy. Pictures are served by
apps.core.media_views.serve_media. Old files still on disk (MEDIA_ROOT) stay readable.

Hardening (update 8): if the database side ever fails (for example the MediaFile migration has not been applied yet),
an upload now FALLS BACK to the disk instead of failing the whole request with a 500, and the problem is logged loudly.
Run `python manage.py check_uploads` to see exactly what is wrong.
"""
import logging
import mimetypes
from urllib.parse import quote

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage, Storage
from django.db import DatabaseError

logger = logging.getLogger('django.request')


class DatabaseMediaStorage(Storage):
    def _model(self):
        from apps.core.models import MediaFile  # lazy: models are not ready at settings-import time
        return MediaFile

    @staticmethod
    def _disk():
        return FileSystemStorage(location=str(settings.MEDIA_ROOT), base_url=settings.MEDIA_URL)

    def _open(self, name, mode='rb'):
        try:
            row = self._model().objects.filter(name=name).first()
        except DatabaseError:
            logger.exception('MediaFile lookup failed for %s — is the core migration applied?', name)
            row = None
        if row is not None:
            return ContentFile(bytes(row.data), name=name)
        disk = self._disk()
        if disk.exists(name):
            return disk.open(name, mode)
        raise FileNotFoundError(name)

    def _save(self, name, content):
        data = b''.join(content.chunks()) if hasattr(content, 'chunks') else content.read()
        ctype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
        try:
            self._model().objects.update_or_create(
                name=name, defaults={'data': data, 'size': len(data), 'content_type': ctype})
        except DatabaseError:
            logger.exception('Could not save %s to the database (run "python manage.py migrate"). '
                             'Falling back to the server disk — this file will NOT survive a redeploy.', name)
            return self._disk()._save(name, ContentFile(data))
        return name

    def exists(self, name):
        try:
            if self._model().objects.filter(name=name).exists():
                return True
        except DatabaseError:
            pass
        return self._disk().exists(name)

    def delete(self, name):
        try:
            self._model().objects.filter(name=name).delete()
        except DatabaseError:
            logger.exception('Could not delete %s from the database', name)
        try:
            self._disk().delete(name)
        except OSError:
            pass

    def size(self, name):
        try:
            n = self._model().objects.filter(name=name).values_list('size', flat=True).first()
        except DatabaseError:
            n = None
        return n if n is not None else self._disk().size(name)

    def url(self, name):
        return f'{settings.MEDIA_URL}{quote(name)}'

    def listdir(self, path):
        raise NotImplementedError('DatabaseMediaStorage cannot list directories.')
