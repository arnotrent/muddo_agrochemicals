"""
Serves uploaded pictures (see media_storage.py) with anti-"save it" protections.

  * Opening a picture's address directly in a tab / iframe / download link is refused (Sec-Fetch-Dest) — the picture
    only loads inside web pages.
  * Private-ish folders (leader / testimonial photos, avatars, old chat files) also refuse to load when embedded by a
    DIFFERENT website (hot-linking): the Referer must be this API, the React site (FRONTEND_URL), PUBLIC_BASE_URL or an
    origin in CORS_ALLOWED_ORIGINS. A missing Referer is allowed (privacy tools strip it).
  * Sent `inline`, nosniff, locked-down CSP, never listable; names are random and EXIF/GPS data is stripped on upload.
No web page can stop a screenshot — this blocks casual saving, direct links and hot-linking.
"""
import mimetypes
from urllib.parse import urlparse

from django.conf import settings
from django.db import DatabaseError
from django.http import Http404, HttpResponse, HttpResponseForbidden
from django.utils._os import safe_join
from django.views.decorators.http import require_safe

PROTECTED_PREFIXES = ('leadership/', 'testimonials/', 'avatars/', 'chat_attachments/')
NAVIGATION_DESTS = {'document', 'iframe', 'frame', 'embed', 'object'}


def _origin(url):
    p = urlparse(url or '')
    return f'{p.scheme}://{p.netloc}'.lower() if p.scheme and p.netloc else ''


def _allowed_origins(request):
    urls = list(getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or [])
    urls += [getattr(settings, 'FRONTEND_URL', ''), getattr(settings, 'PUBLIC_BASE_URL', ''), request.build_absolute_uri('/')]
    out = {_origin(u) for u in urls if u}
    if settings.DEBUG:
        out |= {'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8000', 'http://127.0.0.1:8000'}
    out.discard('')
    return out


@require_safe
def serve_media(request, path):
    if '..' in path or path.startswith('/') or '\x00' in path:
        raise Http404

    if request.headers.get('Sec-Fetch-Dest', '') in NAVIGATION_DESTS:
        return HttpResponseForbidden('This picture can only be viewed on the website.')
    if path.startswith(PROTECTED_PREFIXES):
        referer = request.headers.get('Referer', '')
        if referer and _origin(referer) not in _allowed_origins(request):
            return HttpResponseForbidden('Not available from other websites.')

    from apps.core.models import MediaFile
    try:
        row = MediaFile.objects.filter(name=path).first()
    except DatabaseError:
        row = None
    if row is not None:
        data, ctype = bytes(row.data), row.content_type or mimetypes.guess_type(path)[0]
    else:  # uploaded before database storage existed (or while it was unavailable) and still on disk
        try:
            with open(safe_join(settings.MEDIA_ROOT, path), 'rb') as fh:
                data = fh.read()
        except (OSError, ValueError):
            raise Http404
        ctype = mimetypes.guess_type(path)[0]

    resp = HttpResponse(data, content_type=ctype or 'application/octet-stream')
    resp['Content-Disposition'] = 'inline'
    resp['X-Content-Type-Options'] = 'nosniff'
    resp['Content-Security-Policy'] = "default-src 'none'; sandbox"
    resp['Cache-Control'] = 'private, max-age=3600'
    resp['Cross-Origin-Resource-Policy'] = 'cross-site'  # the React site is a different origin than this API
    return resp
