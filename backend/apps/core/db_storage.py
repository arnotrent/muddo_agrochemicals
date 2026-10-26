"""
Database-backed file storage for uploaded pictures (product photos, agent avatars, leader photos, testimonial photos).

WHY: Render's disk is wiped on every redeploy / restart, so pictures saved under MEDIA_ROOT vanished a short while after
being uploaded. The database (Supabase Postgres) is permanent, so the bytes are kept there instead. Nothing else changes:
models keep using ImageField, URLs stay /media/<name>, and they are served by apps.core.media_views.serve_media.
(When the AWS_* variables are set the project uses S3 instead and this class is not used.)
"""
import mimetypes
import posixpath
from urllib.parse import quote

from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.core.files.base import ContentFile
from django.core.files.storage import Storage


def clean_name(name):
    cleaned = posixpath.normpath(str(name).replace('\\', '/')).lstrip('/')
    if cleaned in ('', '.') or cleaned == '..' or cleaned.startswith('../'):
        raise SuspiciousFileOperation(f'Unsafe file name: {name!r}')
    return cleaned


class DatabaseStorage(Storage):
    @staticmethod
    def _rows():
        from apps.core.models import StoredFile
        return StoredFile.objects

    def _open(self, name, mode='rb'):
        row = self._rows().filter(name=clean_name(name)).first()
        if row is None:
            raise FileNotFoundError(name)
        return ContentFile(bytes(row.content), name=name)

    def _save(self, name, content):
        name = clean_name(name)
        if hasattr(content, 'seek'):
            content.seek(0)
        data = b''.join(content.chunks())
        ctype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
        self._rows().update_or_create(name=name, defaults={'content': data, 'content_type': ctype, 'size': len(data)})
        return name

    def exists(self, name):
        return self._rows().filter(name=clean_name(name)).exists()

    def delete(self, name):
        if name:
            self._rows().filter(name=clean_name(name)).delete()

    def size(self, name):
        row = self._rows().filter(name=clean_name(name)).values_list('size', flat=True).first()
        if row is None:
            raise FileNotFoundError(name)
        return row

    def url(self, name):
        return f"{settings.MEDIA_URL.rstrip('/')}/{quote(clean_name(name))}"

    def listdir(self, path):
        prefix = clean_name(path) + '/' if path else ''
        files, dirs = set(), set()
        for n in self._rows().filter(name__startswith=prefix).values_list('name', flat=True):
            rest = n[len(prefix):]
            (dirs if '/' in rest else files).add(rest.split('/')[0])
        return sorted(dirs), sorted(files)
