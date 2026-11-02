"""
Admin self-test (no shell needed — Render's free tier has none). Shown in Admin → Settings → "Self-test".
Every check says PASS / FAIL and, on FAIL, what to do.
"""
import io

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import Client
from django.urls import Resolver404, resolve
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsAdmin


def _png():
    from PIL import Image
    buf = io.BytesIO()
    Image.new('RGB', (24, 24), (20, 140, 70)).save(buf, 'PNG')
    return buf.getvalue()


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_selftest_view(request):
    checks = []

    def check(name, fn, fix=''):
        try:
            detail = fn()
            checks.append({'name': name, 'ok': True, 'detail': str(detail or 'ok'), 'fix': ''})
        except Exception as e:  # noqa: BLE001
            checks.append({'name': name, 'ok': False, 'detail': f'{type(e).__name__}: {e}'[:300], 'fix': fix})

    tables = set()
    try:
        tables = set(connection.introspection.table_names())
    except Exception:  # noqa: BLE001
        pass
    applied = set()
    try:
        applied = {n for _, n in MigrationExecutor(connection).loader.applied_migrations}
    except Exception:  # noqa: BLE001
        pass

    # ── routes ──
    for label, path in [('Admin reviews API', '/api/v1/admin/reviews/'), ('Admin testimonials API', '/api/v1/admin/testimonials/'),
                        ('Leadership API', '/api/v1/leadership/'), ('Recent product reviews API', '/api/v1/reviews/recent/')]:
        def route(p=path):
            m = resolve(p)
            return f'{p} → {m.view_name or m.func.__name__}'
        check(f'Route: {label}', route, 'The backend does not have this URL. Check muddo_project/urls.py includes the app and products/urls_api.py has no syntax errors, then redeploy the backend.')
    if not settings.USE_S3_MEDIA:
        def media_route():
            return resolve('/media/leadership/x.jpg').view_name
        check('Route: /media/ pictures', media_route, 'Add the serve_media route to muddo_project/urls.py (python scripts/verify_setup.py --fix).')

    # ── review / testimonial data layer ──
    def reviews_db():
        from apps.products.models import ProductReview
        from apps.testimonials.models import Testimonial
        assert 'hidden' in dict(ProductReview.STATUS), 'ProductReview has no "hidden" status (models.py not updated)'
        assert 'hidden' in dict(Testimonial.STATUS), 'Testimonial has no "hidden" status (models.py not updated)'
        return f'{ProductReview.objects.count()} product reviews, {Testimonial.objects.count()} testimonials readable'
    check('Reviews & testimonials data', reviews_db, 'Run python scripts/verify_setup.py --fix, commit, redeploy.')

    # ── picture storage ──
    check('Picture storage backend', lambda: f'{default_storage.__class__.__name__}'
          + ('' if settings.USE_S3_MEDIA or 'DatabaseMediaStorage' in default_storage.__class__.__name__
             else ' — pictures are NOT stored in the database, they will vanish on redeploy'),
          'Add DEFAULT_FILE_STORAGE = "apps.core.media_storage.DatabaseMediaStorage" to settings.py (python scripts/verify_setup.py --fix).')

    def table():
        if settings.USE_S3_MEDIA:
            return 'using S3 — table not needed'
        assert 'core_mediafile' in tables, 'table core_mediafile does not exist (migration missing/unapplied)'
        return 'core_mediafile exists'
    check('Picture table (core_mediafile)', table, 'The migration for MediaFile is missing or was not applied. Run python scripts/verify_setup.py --fix, commit the new migration file, redeploy (the build runs migrate).')

    def chat_table():
        assert 'messaging_storedfile' in tables, 'table messaging_storedfile does not exist'
        return 'messaging_storedfile exists'
    if not settings.USE_S3_MEDIA:
        check('Chat-file table (messaging_storedfile)', chat_table, 'Same fix: python scripts/verify_setup.py --fix, commit, redeploy.')

    probe = {}

    def roundtrip():
        n = default_storage.save('_probe/selftest.png', ContentFile(_png()))
        probe['n'] = n
        assert default_storage.exists(n), 'saved but exists() is False'
        with default_storage.open(n, 'rb') as fh:
            assert fh.read() == _png(), 'bytes read back differ'
        if not settings.USE_S3_MEDIA:
            from apps.core.models import MediaFile
            assert MediaFile.objects.filter(name=n).exists(), 'saved to DISK, not the database (it will vanish on redeploy)'
        return 'picture saved and read back'
    check('Save → read back', roundtrip, 'See the two checks above: the table or storage setting is missing.')

    def serve():
        if settings.USE_S3_MEDIA:
            return 'using S3 — served directly by the bucket'
        c = Client(HTTP_HOST=request.get_host())
        url = default_storage.url(probe['n'])
        ok = c.get(url, secure=True, HTTP_SEC_FETCH_DEST='image')
        assert ok.status_code == 200, f'loading it as an image gave HTTP {ok.status_code}'
        nav = c.get(url, secure=True, HTTP_SEC_FETCH_DEST='document')
        assert nav.status_code == 403, f'opening it directly should be refused (403) but gave {nav.status_code}'
        return 'loads as an image (200); direct open refused (403)'
    if 'n' in probe:
        check('Serve a picture', serve, 'The /media/ route or serve_media view is wrong — python scripts/verify_setup.py --fix.')

    def leader():
        from apps.core.image_utils import sanitize_image
        from apps.leadership.models import Leader
        up = SimpleUploadedFile('probe.png', _png(), content_type='image/png')
        l = Leader(name='_selftest', title='_selftest')
        l.photo.save('probe.png', sanitize_image(up, max_side=900, name_prefix='leader'), save=True)
        try:
            url = l.photo_path
            assert url and '/media/' in url, f'unexpected photo URL {url!r}'
            if not (settings.PUBLIC_BASE_URL or '').strip():
                return f'{url}  (PUBLIC_BASE_URL is empty: agent avatars get relative URLs — set it to this API\'s https address)'
            return url
        finally:
            l.photo.delete(save=False)
            l.delete()
    check('Real leader-photo upload path', leader, 'The picture could not be stored — see the failed checks above.')

    if probe.get('n'):
        try:
            default_storage.delete(probe['n'])
        except Exception:  # noqa: BLE001
            pass

    def cors():
        origins = list(getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or [])
        assert origins, 'CORS_ALLOWED_ORIGINS is empty'
        return ', '.join(origins)
    check('Website origins allowed (CORS_ALLOWED_ORIGINS)', cors, 'Set CORS_ALLOWED_ORIGINS on Render to your website address.')

    return Response({'ok': all(c['ok'] for c in checks), 'checks': checks})
