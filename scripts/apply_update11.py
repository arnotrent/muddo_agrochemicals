#!/usr/bin/env python3
"""Update 11 - run from the repo root:  python scripts/apply_update11.py   (idempotent, strict)
Fixes: admin /reviews 404, uploads (pictures + chat files) failing, review/testimonial 'hidden' status."""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0

def rd(rel):
    p = ROOT / rel
    return (p.read_text(encoding='utf-8') if p.exists() else None), p

def edit(rel, old, new, marker):
    global bad
    t, p = rd(rel)
    if t is None: print(f'!! {rel} not found'); bad += 1; return
    if marker in t: print(f'-- {rel}: already applied ({marker[:40]})'); return
    if t.count(old) != 1: print(f'!! {rel}: anchor not found exactly once - edit by hand:\n   {old[:150]!r}'); bad += 1; return
    p.write_text(t.replace(old, new), encoding='utf-8'); print(f'OK {rel}')

def append(rel, text, marker):
    global bad
    t, p = rd(rel)
    if t is None: print(f'!! {rel} not found'); bad += 1; return
    if marker in t: print(f'-- {rel}: already applied ({marker})'); return
    p.write_text(t.rstrip('\n') + '\n' + text, encoding='utf-8'); print(f'OK {rel}')

# 1. models the storage code imports (their absence made every upload / media request / chat file fail)
append('backend/apps/core/models.py', '''

class MediaFile(models.Model):
    """Bytes of an uploaded picture, kept in the database so redeploys cannot wipe them (see media_storage.py)."""
    name = models.CharField(max_length=300, unique=True)
    data = models.BinaryField()
    content_type = models.CharField(max_length=100, blank=True)
    size = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
''', 'class MediaFile')
append('backend/apps/messaging/models.py', '''

class StoredFile(models.Model):
    """Bytes of a chat attachment, kept in the database so redeploys can never wipe them (see storage.DatabaseStorage)."""
    name = models.CharField(max_length=255, unique=True)
    data = models.BinaryField()
    size = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
''', 'class StoredFile')

# 2. 'hidden' status (admin Reviews / Testimonials "Hide" buttons PATCH it; the model rejected it)
OLD = "    STATUS = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]"
NEW = "    STATUS = [('pending', 'Pending'), ('approved', 'Approved'), ('hidden', 'Hidden'), ('rejected', 'Rejected')]"
edit('backend/apps/products/models.py', OLD, NEW, "('hidden', 'Hidden')")
edit('backend/apps/testimonials/models.py', OLD, NEW, "('hidden', 'Hidden')")

# 3. self-test endpoint used by Admin > Settings
edit('backend/apps/core/urls_api.py', 'from django.urls import path\n', 'from django.urls import path\nfrom apps.core import diagnostics_views as diag\n', 'diagnostics_views')
edit('backend/apps/core/urls_api.py', "    # agent\n", "    path('admin/diagnostics/selftest/', diag.admin_selftest_view, name='api_admin_selftest'),\n\n    # agent\n", 'api_admin_selftest')

# 4. avatars: re-encode like leader / testimonial photos (strips EXIF/GPS, bounds size)
edit('backend/apps/agents/serializers.py', 'from apps.core.validators import validate_image_upload\n',
     'from apps.core.validators import validate_image_upload\nfrom apps.core.image_utils import sanitize_image\n', 'import sanitize_image')
edit('backend/apps/agents/serializers.py', '            validate_image_upload(value)\n        return value',
     "            validate_image_upload(value)\n            return sanitize_image(value, max_side=480, name_prefix='agent')\n        return value", "name_prefix='agent'")

# 5. frontend: the /admin/reviews route did not exist -> the sidebar link fell through to the 404 page
edit('frontend/src/App.jsx', "const AdminTestimonialsPage = lazy(() => import('./pages/admin/AdminTestimonialsPage'))\n",
     "const AdminTestimonialsPage = lazy(() => import('./pages/admin/AdminTestimonialsPage'))\nconst AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'))\n", 'AdminReviewsPage = lazy')
edit('frontend/src/App.jsx', '                  <Route path="/admin/testimonials" element={<AdminTestimonialsPage />} />\n',
     '                  <Route path="/admin/testimonials" element={<AdminTestimonialsPage />} />\n                  <Route path="/admin/reviews" element={<AdminReviewsPage />} />\n', 'path="/admin/reviews"')

# 6. Settings page: show the self-test and the recovery e-mail card
edit('frontend/src/pages/admin/AdminSettingsPage.jsx', "import Icon from '../../components/Icon'\n",
     "import Icon from '../../components/Icon'\nimport SelfTestCard from '../../components/SelfTestCard'\nimport AdminEmailCard from '../../components/AdminEmailCard'\n", 'SelfTestCard')
edit('frontend/src/pages/admin/AdminSettingsPage.jsx', '      {sysinfo && (\n', '      <AdminEmailCard />\n      <SelfTestCard />\n\n      {sysinfo && (\n', '<SelfTestCard />')

print('\nAll update-11 edits applied.' if not bad else f'\n{bad} edit(s) need to be made by hand - see the "!!" lines.')
sys.exit(1 if bad else 0)
