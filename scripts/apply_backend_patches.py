#!/usr/bin/env python3
"""
Applies the small edits this update needs to EXISTING backend files.
Run from the repo root:   python scripts/apply_backend_patches.py
Idempotent (safe to run twice) and strict: if an anchor is missing it stops and tells you
which file/edit to make by hand, rather than silently skipping.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
B = ROOT / 'backend'
AMETRYN = (ROOT / 'scripts' / 'ametryn_seed_entry.txt').read_text()

SETTINGS_BLOCK = '''
# ─────────────────────────────────────────────────────────────────
# PRIVATE CHAT ATTACHMENTS + UPLOAD LIMITS (this update)
# Chat files live OUTSIDE MEDIA_ROOT, so no public URL exists for them; they are only
# served through the authenticated/signed endpoint in apps/messaging/api_views.py.
# NOTE: Render's free-tier disk is ephemeral. Set the AWS_* / Supabase S3 variables so
# attachments (and product photos) persist across deploys.
# ─────────────────────────────────────────────────────────────────
PRIVATE_MEDIA_ROOT = BASE_DIR / 'private_media'
DATA_UPLOAD_MAX_MEMORY_SIZE = 30 * 1024 * 1024   # whole request body (multi-file messages)
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024    # larger files stream to temp disk
DATA_UPLOAD_MAX_NUMBER_FILES = 20
'''

EDITS = [
 ('backend/muddo_project/settings.py', [
   ("    'apps.distributors',\n    'apps.analytics',\n]",
    "    'apps.distributors',\n    'apps.analytics',\n    'apps.leadership',\n]", "apps.leadership"),
   ("        'newsletter': '10/min',\n    },",
    "        'newsletter': '10/min',\n        'review': '5/hour',      # public product reviews\n        'chat': '90/min',        # message sends per user\n    },", "'review': '5/hour'"),
   ("DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'\n",
    "DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'\n" + SETTINGS_BLOCK, "PRIVATE_MEDIA_ROOT"),
 ]),
 ('backend/muddo_project/urls.py', [
   ("    path('api/v1/', include('apps.analytics.urls_api')),\n]",
    "    path('api/v1/', include('apps.analytics.urls_api')),\n    path('api/v1/', include('apps.leadership.urls_api')),\n]", "apps.leadership.urls_api"),
 ]),
 ('backend/apps/core/auth_views.py', [
   ("from rest_framework.throttling import ScopedRateThrottle\n",
    "from apps.core.throttles import AuthThrottle\n", "AuthThrottle"),
   ("@throttle_classes([ScopedRateThrottle])\ndef login_view(request):",
    "@throttle_classes([AuthThrottle])\ndef login_view(request):", "@throttle_classes([AuthThrottle])"),
   ("    login_view.throttle_scope = 'auth'\n", "", None),
 ]),
 ('backend/apps/core/api_views.py', [
   ("from apps.core.models import ContactRequest,",
    "from apps.core.throttles import NewsletterThrottle\nfrom apps.core.models import ContactRequest,", "NewsletterThrottle"),
   ("@throttle_classes([ScopedRateThrottle])\ndef subscribe_view(request):\n    subscribe_view.throttle_scope = 'newsletter'\n",
    "@throttle_classes([NewsletterThrottle])\ndef subscribe_view(request):\n", "@throttle_classes([NewsletterThrottle])"),
 ]),
 ('backend/apps/core/management/commands/seed_data.py', [
   (" {'name':'KNAPSACK SPRAYER 16L'", AMETRYN + " {'name':'KNAPSACK SPRAYER 16L'", "'name':'M-D AMETRYN'"),
 ]),
]

bad = 0
for rel, edits in EDITS:
    path = ROOT / rel
    if not path.exists():
        print(f'!! {rel} not found'); bad += 1; continue
    text = path.read_text()
    changed = False
    for old, new, marker in edits:
        if marker and marker in text and (old not in text or marker in text.replace(old, '')):
            print(f'-- {rel}: already applied ({marker[:28]})'); continue
        if old not in text and marker is None:
            print(f'-- {rel}: removal already applied'); continue
        if old not in text:
            print(f'!! {rel}: anchor not found — make this edit by hand:\n{old!r}'); bad += 1; continue
        text = text.replace(old, new, 1); changed = True
    if changed:
        path.write_text(text); print(f'OK {rel}')
sys.exit(1 if bad else 0)
