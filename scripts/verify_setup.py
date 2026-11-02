#!/usr/bin/env python3
"""
Checks that updates 6-9 are REALLY installed in this repo and (with --fix) installs what is missing.

    python scripts/verify_setup.py          # report only
    python scripts/verify_setup.py --fix    # apply every missing edit, then report again

Run from the repo root. Afterwards: commit, push, redeploy backend, rebuild frontend.
"""
import re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIX = '--fix' in sys.argv


def rd(rel):
    p = ROOT / rel
    return p.read_text(encoding='utf-8') if p.exists() else None


def wr(rel, text):
    (ROOT / rel).write_text(text, encoding='utf-8')


def migs(app):
    d = ROOT / 'backend' / 'apps' / app / 'migrations'
    return [p.read_text(encoding='utf-8') for p in d.glob('[0-9][0-9][0-9][0-9]_*.py')] if d.exists() else []


# ── extra fixers the apply_update scripts do not cover (tolerant anchors) ──────────────────
def fix_app_routes():
    t = rd('frontend/src/App.jsx')
    if t is None: return
    if 'AdminReviewsPage' not in t:
        imp = "const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'))\n"
        m = re.search(r'\nfunction RouteLoader', t)
        t = t[:m.start() + 1] + imp + '\n' + t[m.start() + 1:] if m else t
    if 'path="/admin/reviews"' not in t:
        m = re.search(r'^([ \t]*)<Route path="/admin/settings"', t, re.M)
        if m:
            t = t[:m.start()] + f'{m.group(1)}<Route path="/admin/reviews" element={{<AdminReviewsPage />}} />\n' + t[m.start():]
    wr('frontend/src/App.jsx', t)


def fix_settings_card():
    t = rd('frontend/src/pages/admin/AdminSettingsPage.jsx')
    if t is None: return
    if 'SelfTestCard' not in t:
        t = t.replace("import Icon from '../../components/Icon'\n", "import Icon from '../../components/Icon'\nimport SelfTestCard from '../../components/SelfTestCard'\n", 1)
        t = t.replace('      {sysinfo && (\n', '      <SelfTestCard />\n\n      {sysinfo && (\n', 1)
    wr('frontend/src/pages/admin/AdminSettingsPage.jsx', t)


def fix_selftest_route():
    t = rd('backend/apps/core/urls_api.py')
    if t is None: return
    if 'selftest' not in t:
        t = t.replace('from django.urls import path\n', 'from django.urls import path\nfrom apps.core import diagnostics_views as diag\n', 1)
        t = re.sub(r'\n\]\s*$', "\n    path('admin/diagnostics/selftest/', diag.admin_selftest_view, name='api_admin_selftest'),\n]\n", t, count=1)
    wr('backend/apps/core/urls_api.py', t)


def fix_run_scripts():
    for s in ('apply_update6.py', 'apply_update7.py', 'apply_update8.py'):
        if (ROOT / 'scripts' / s).exists():
            print(f'\n=== running {s} ===')
            subprocess.call([sys.executable, str(ROOT / 'scripts' / s)])


def has(rel, needle):
    t = rd(rel)
    return t is not None and needle in t


def exists(rel):
    return (ROOT / rel).exists()


CHECKS = [
    ('Admin Reviews route in App.jsx (the 404)', lambda: has('frontend/src/App.jsx', 'path="/admin/reviews"') and has('frontend/src/App.jsx', 'AdminReviewsPage'), fix_app_routes),
    ('AdminReviewsPage.jsx exists', lambda: exists('frontend/src/pages/admin/AdminReviewsPage.jsx'), None),
    ('Settings page shows the self-test', lambda: has('frontend/src/pages/admin/AdminSettingsPage.jsx', 'SelfTestCard'), fix_settings_card),
    ('Self-test API route', lambda: has('backend/apps/core/urls_api.py', 'selftest'), fix_selftest_route),
    ('products/urls_api.py is not broken', lambda: not has('backend/apps/products/urls_api.py', "'reviews/recent/'.as_view()"), fix_run_scripts),
    ('Picture storage set in settings.py', lambda: has('backend/muddo_project/settings.py', 'DatabaseMediaStorage'), fix_run_scripts),
    ('/media/ served by serve_media in urls.py', lambda: has('backend/muddo_project/urls.py', 'serve_media'), fix_run_scripts),
    ('core.MediaFile model', lambda: has('backend/apps/core/models.py', 'class MediaFile'), fix_run_scripts),
    ('core migration creating MediaFile', lambda: any('MediaFile' in m for m in migs('core')), fix_run_scripts),
    ('messaging.StoredFile model', lambda: has('backend/apps/messaging/models.py', 'class StoredFile'), fix_run_scripts),
    ('messaging migration creating StoredFile', lambda: any('StoredFile' in m for m in migs('messaging')), fix_run_scripts),
    ('products review "hidden" status (model)', lambda: has('backend/apps/products/models.py', "('hidden', 'Hidden')"), fix_run_scripts),
    ('products migration for "hidden"', lambda: any("'hidden'" in m for m in migs('products')), fix_run_scripts),
    ('testimonials "hidden" status (model)', lambda: has('backend/apps/testimonials/models.py', "('hidden', 'Hidden')"), fix_run_scripts),
    ('testimonials migration for "hidden"', lambda: any("'hidden'" in m for m in migs('testimonials')), fix_run_scripts),
    ('media_storage.py / media_views.py present', lambda: exists('backend/apps/core/media_storage.py') and exists('backend/apps/core/media_views.py'), None),
    ('Image picker + modal components present', lambda: exists('frontend/src/components/ImageDropzone.jsx') and exists('frontend/src/components/Modal.jsx'), None),
    ('Exact-tip map pin present', lambda: exists('frontend/src/utils/mapPin.js') and has('frontend/src/components/LocationPicker.jsx', 'makePin'), fix_run_scripts),
]


def report():
    bad = 0
    for name, test, _ in CHECKS:
        try:
            ok = bool(test())
        except Exception as e:  # noqa: BLE001
            ok = False
        print(f'{"PASS" if ok else "FAIL"}  {name}')
        bad += 0 if ok else 1
    return bad


if __name__ == '__main__':
    bad = report()
    if bad and FIX:
        done = set()
        for name, test, fixer in CHECKS:
            if fixer and not test() and fixer not in done:
                done.add(fixer)
                fixer()
        print('\n--- after fixing ---')
        bad = report()
    if bad:
        print(f'\n{bad} item(s) still failing.' + ('' if FIX else '  Run with --fix.'))
        print('Items marked as files that are "present" mean the package folders were not copied over the repo — copy backend/, frontend/ and scripts/ from muddo_update_9.zip first.')
    else:
        print('\nAll good. Now: commit + push, redeploy the backend (it runs migrate), rebuild the frontend, then Admin → Settings → Run self-test.')
    sys.exit(1 if bad else 0)
