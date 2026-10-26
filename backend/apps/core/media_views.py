"""Serves /media/<path> from the database (see db_storage.py); falls back to the disk for files uploaded before the switch."""
from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.http import Http404, HttpResponse
from django.views.static import serve

from apps.core.db_storage import clean_name
from apps.core.models import StoredFile


def serve_media(request, path):
    try:
        name = clean_name(path)
    except SuspiciousFileOperation:
        raise Http404
    row = StoredFile.objects.filter(name=name).first()
    if row is None:
        return serve(request, path, document_root=settings.MEDIA_ROOT)  # raises Http404 when absent
    ctype = row.content_type or 'application/octet-stream'
    resp = HttpResponse(bytes(row.content), content_type=ctype)
    resp['Cache-Control'] = 'public, max-age=86400'   # stored names are unique, so caching is safe
    resp['X-Content-Type-Options'] = 'nosniff'
    if not ctype.startswith('image/'):
        resp['Content-Disposition'] = 'attachment'      # never render anything but pictures in the browser
    return resp
