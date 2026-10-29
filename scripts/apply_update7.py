#!/usr/bin/env python3
"""Update 7 — persistent + protected uploaded pictures. Run from the repo root after copying the package files over:
   python scripts/apply_update7.py        (idempotent; "!!" lines name an edit to make by hand)"""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0

def _read(rel):
    p = ROOT / rel
    return (p.read_text(encoding='utf-8') if p.exists() else None), p

def edit(rel, steps):
    global bad
    t, p = _read(rel)
    if t is None: print(f'!! {rel} not found'); bad += 1; return
    ch = False
    for old, new, marker in steps:
        if marker in t: print(f'-- {rel}: already applied ({marker[:40]})'); continue
        if t.count(old) != 1: print(f'!! {rel}: anchor not found exactly once — edit by hand:\n   {old[:160]!r}'); bad += 1; continue
        t = t.replace(old, new); ch = True
    if ch: p.write_text(t, encoding='utf-8'); print(f'OK {rel}')

def rx(rel, pattern, repl, marker):
    global bad
    t, p = _read(rel)
    if t is None: print(f'!! {rel} not found'); bad += 1; return
    if marker in t: print(f'-- {rel}: already applied ({marker[:40]})'); return
    new, n = re.subn(pattern, lambda m: repl, t, count=1, flags=re.S)
    if n != 1: print(f'!! {rel}: pattern not found ({marker}) — see the notes in the reply'); bad += 1; return
    p.write_text(new, encoding='utf-8'); print(f'OK {rel}')

def migration(app, slug, body):
    global bad
    d = ROOT / 'backend' / 'apps' / app / 'migrations'
    if not d.exists(): print(f'!! {d} not found'); bad += 1; return
    if list(d.glob(f'*_{slug}.py')): print(f'-- {app}: migration {slug} already exists'); return
    prev = sorted(p.stem for p in d.glob('[0-9][0-9][0-9][0-9]_*.py'))[-1]
    n = int(prev[:4]) + 1
    (d / f'{n:04d}_{slug}.py').write_text(body.replace('__PREV__', prev), encoding='utf-8')
    print(f'OK {app}: created migration {n:04d}_{slug} (after {prev})')

# ── 1. the MediaFile model (picture bytes) + its migration ────────────────
MODEL = '''

class MediaFile(models.Model):
    """Bytes of an uploaded picture, kept in the database so redeploys cannot wipe them (see media_storage.py)."""
    name = models.CharField(max_length=300, unique=True)
    data = models.BinaryField()
    content_type = models.CharField(max_length=100, blank=True)
    size = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
'''
t, p = _read('backend/apps/core/models.py')
if t is None: print('!! backend/apps/core/models.py not found'); bad += 1
elif 'class MediaFile' in t: print('-- core/models.py: MediaFile already present')
else: p.write_text(t.rstrip('\n') + '\n' + MODEL, encoding='utf-8'); print('OK backend/apps/core/models.py')
migration('core', 'update7_mediafile', '''from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '__PREV__')]
    operations = [
        migrations.CreateModel(
            name='MediaFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=300, unique=True)),
                ('data', models.BinaryField()),
                ('content_type', models.CharField(blank=True, max_length=100)),
                ('size', models.BigIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
''')

# ── 2. use it as the default file storage (only when no S3 bucket is configured) ──
edit('backend/muddo_project/settings.py', [(
    "    MEDIA_URL = '/media/'\n    MEDIA_ROOT = BASE_DIR / 'media'",
    "    MEDIA_URL = '/media/'\n    MEDIA_ROOT = BASE_DIR / 'media'\n    # Uploaded pictures live in the database (Render's disk is wiped on redeploy). See apps/core/media_storage.py\n    DEFAULT_FILE_STORAGE = 'apps.core.media_storage.DatabaseMediaStorage'",
    'DatabaseMediaStorage')])

# ── 3. serve /media/ from the database, with protections (dev and production) ──
rx('backend/muddo_project/urls.py', r"if settings\.DEBUG:\n\s*urlpatterns \+= static\(.*\Z",
   "if not settings.USE_S3_MEDIA:\n    # Pictures are stored in the database and served (with anti-download protections) by this view.\n"
   "    from apps.core.media_views import serve_media\n"
   "    urlpatterns += [re_path(r'^media/(?P<path>.*)$', serve_media, name='serve_media')]\n", 'serve_media')

# ── 4. agent avatars: re-encode like leader/testimonial photos (strips EXIF/GPS, bounds size) ──
edit('backend/apps/agents/serializers.py', [
    ("from apps.core.validators import validate_image_upload\n",
     "from apps.core.validators import validate_image_upload\nfrom apps.core.image_utils import sanitize_image\n", 'import sanitize_image'),
])
rx('backend/apps/agents/serializers.py',
   r"def validate_avatar\(self, value\):\s*if value:\s*validate_image_upload\(value\)\s*return value",
   "def validate_avatar(self, value):\n        if value:\n            validate_image_upload(value)\n            return sanitize_image(value, max_side=480, name_prefix='agent')\n        return value",
   "name_prefix='agent'")

# ── 5. frontend: pictures of people can't be right-click-saved or dragged out ──
IMG = 'className="w-full h-full object-cover" />'
SAFE = 'className="w-full h-full object-cover pointer-events-none select-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />'
edit('frontend/src/components/Avatar.jsx', [(IMG, SAFE, 'pointer-events-none select-none')])
edit('frontend/src/components/LeadershipSection.jsx', [(IMG, SAFE, 'pointer-events-none select-none')])

print('\nAll update-7 edits applied.' if not bad else f'\n{bad} edit(s) need to be made by hand — see the "!!" lines above.')
sys.exit(1 if bad else 0)
