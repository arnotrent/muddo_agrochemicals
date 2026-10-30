import io

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.test import Client


def _host():
    for h in settings.ALLOWED_HOSTS:
        if h and h != '*':
            return h.lstrip('.') if not h.startswith('.') else f'api{h}'
    return 'localhost'


class Command(BaseCommand):
    help = ('Self-test for picture uploads: storage backend, database table, save -> read -> serve (allowed and refused), '
            'and a real Leader photo round-trip. Exit code 1 on failure. Run it in the Render shell.')

    def handle(self, *a, **o):
        from PIL import Image
        bad = 0
        buf = io.BytesIO()
        Image.new('RGB', (24, 24), (20, 140, 70)).save(buf, 'PNG')
        png = buf.getvalue()

        def step(name, fn):
            nonlocal bad
            try:
                detail = fn()
                self.stdout.write(f'{self.style.SUCCESS("PASS")}  {name}: {detail or "ok"}')
            except Exception as e:  # noqa: BLE001
                bad += 1
                self.stdout.write(f'{self.style.ERROR("FAIL")}  {name}: {type(e).__name__}: {e}')

        step('Storage backend', lambda: f'{default_storage.__class__.__module__}.{default_storage.__class__.__name__}'
             + ('' if settings.USE_S3_MEDIA or 'DatabaseMediaStorage' in default_storage.__class__.__name__
                else '  <-- expected DatabaseMediaStorage (settings.DEFAULT_FILE_STORAGE missing?)'))
        step('PUBLIC_BASE_URL', lambda: (settings.PUBLIC_BASE_URL or
                                         (_ for _ in ()).throw(RuntimeError('empty: agent avatars would get relative /media/ URLs. '
                                                                           'Set PUBLIC_BASE_URL to this API\'s https address.'))))

        def table():
            from apps.core.models import MediaFile
            return f'MediaFile table reachable ({MediaFile.objects.count()} pictures stored)'
        step('Database table (core.MediaFile)', table)

        name = {}

        def roundtrip():
            n = default_storage.save('_probe/check.png', ContentFile(png))
            name['n'] = n
            assert default_storage.exists(n), 'saved but exists() is False'
            with default_storage.open(n, 'rb') as fh:
                assert fh.read() == png, 'bytes read back differ'
            from apps.core.models import MediaFile
            assert MediaFile.objects.filter(name=n).exists(), 'NOT in the database — it fell back to disk (see server log)'
            return f'saved + read back as {n}'
        step('Save → read back (stored in database)', roundtrip)

        def serve():
            c = Client(HTTP_HOST=_host())
            url = default_storage.url(name['n'])
            ok = c.get(url, secure=True, HTTP_SEC_FETCH_DEST='image')
            assert ok.status_code == 200 and ok.content == png, f'image request -> HTTP {ok.status_code}'
            nav = c.get(url, secure=True, HTTP_SEC_FETCH_DEST='document')
            assert nav.status_code == 403, f'direct navigation should be refused (403) but gave {nav.status_code}'
            return f'{url}: loads as an image (200), refused when opened directly (403)'
        if 'n' in name:
            step('Serve /media/ picture', serve)

        def leader():
            from apps.core.image_utils import sanitize_image
            from apps.leadership.models import Leader
            up = SimpleUploadedFile('probe.png', png, content_type='image/png')
            l = Leader(name='_probe', title='_probe')
            l.photo.save('probe.png', sanitize_image(up, max_side=900, name_prefix='leader'), save=True)
            try:
                url = l.photo_path
                assert url and '/media/leadership/' in url, f'unexpected URL {url}'
                return f'Leader photo saved, URL {url}'
            finally:
                l.photo.delete(save=False)
                l.delete()
        step('Leader photo round-trip (the real upload path)', leader)

        if 'n' in name:
            try:
                default_storage.delete(name['n'])
            except Exception:  # noqa: BLE001
                pass
        self.stdout.write(self.style.SUCCESS('\nUploads are healthy.') if not bad else self.style.ERROR(f'\n{bad} problem(s) — fix the FAIL lines above.'))
        raise SystemExit(1 if bad else 0)
