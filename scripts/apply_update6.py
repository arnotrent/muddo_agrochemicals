#!/usr/bin/env python3
"""Update 6 — one small edit to settings.py. Run from repo root. Idempotent."""
import sys
from pathlib import Path
p = Path(__file__).resolve().parent.parent / 'backend/muddo_project/settings.py'
t = p.read_text()
if 'apps.core.db_storage.DatabaseStorage' in t:
    print('-- settings.py: already applied'); sys.exit(0)
old = "else:\n    MEDIA_URL = '/media/'\n    MEDIA_ROOT = BASE_DIR / 'media'\n"
new = ("else:\n    # No S3: keep uploaded pictures IN THE DATABASE (Render's disk is wiped on every redeploy).\n"
       "    DEFAULT_FILE_STORAGE = 'apps.core.db_storage.DatabaseStorage'\n"
       "    MEDIA_URL = '/media/'\n    MEDIA_ROOT = BASE_DIR / 'media'\n")
if t.count(old) != 1:
    print('!! anchor not found — in settings.py, inside the `else:` of `if USE_S3_MEDIA:` add:\n'
          "    DEFAULT_FILE_STORAGE = 'apps.core.db_storage.DatabaseStorage'"); sys.exit(1)
p.write_text(t.replace(old, new)); print('OK settings.py')
