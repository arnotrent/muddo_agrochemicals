#!/usr/bin/env python3
"""Run from the repo root:  python scripts/diagnose.py   and paste the whole output into the chat.
Read-only: it changes nothing and masks passwords. Needs the backend's environment (the same .env / variables you use to run it)."""
import os, re, subprocess, sys
from pathlib import Path

ROOT = Path.cwd()
BACK, FRONT = ROOT / 'backend', ROOT / 'frontend' / 'src'

def hr(t): print(f'\n===== {t} =====')

hr('1. Where the sign-in / login links are (frontend)')
if FRONT.exists():
    pat = re.compile(r"""['"`]/(login|admin|portal)['"`/?]|Staff Login|Sign ?in""", re.I)
    for f in sorted(FRONT.rglob('*.jsx')):
        if f.parts[-2] in ('admin',) or 'pages/portal' in str(f).replace('\\', '/'):
            continue
        for i, line in enumerate(f.read_text(encoding='utf-8', errors='ignore').splitlines(), 1):
            if pat.search(line):
                print(f'{f.relative_to(ROOT)}:{i}: {line.strip()[:150]}')
else:
    print('frontend/src not found - run this from the repo root')

def run(label, args, timeout=90):
    hr(label)
    if not (BACK / 'manage.py').exists():
        print('backend/manage.py not found'); return
    try:
        p = subprocess.run([sys.executable, 'manage.py', *args], cwd=BACK, capture_output=True, text=True, timeout=timeout)
        out = re.sub(r'(postgres(?:ql)?://[^:\s]+:)[^@\s]+@', r'\1****@', (p.stdout + p.stderr))
        print(out[-3500:] or '(no output)', f'\n[exit code {p.returncode}]')
    except Exception as e:  # noqa: BLE001
        print(f'could not run: {e}')

run('2. Django system check', ['check'])
run('3. Migration status (look for [ ] = not applied, or errors)', ['showmigrations', '--plan'])
run('4. Models that need a migration (should say "No changes detected")', ['makemigrations', '--check', '--dry-run'])

hr('5. Database + storage configuration (passwords hidden)')
code = r'''
import re
from django.conf import settings
from django.db import connection
d = settings.DATABASES["default"]
print("engine:", d["ENGINE"], "| host:", d.get("HOST") or "(local file)", "| port:", d.get("PORT"), "| options:", d.get("OPTIONS"), "| conn_max_age:", d.get("CONN_MAX_AGE"), "| disable_server_side_cursors:", d.get("DISABLE_SERVER_SIDE_CURSORS"))
st = getattr(settings, "STORAGES", None)
print("STORAGES:", st)
print("DEFAULT_FILE_STORAGE:", getattr(settings, "DEFAULT_FILE_STORAGE", "(not set)"))
print("USE_S3_MEDIA:", getattr(settings, "USE_S3_MEDIA", "(not set)"), "| MEDIA_URL:", settings.MEDIA_URL, "| PUBLIC_BASE_URL:", getattr(settings, "PUBLIC_BASE_URL", ""))
try:
    with connection.cursor() as c:
        c.execute("select 1"); print("database connection: OK")
except Exception as e:
    print("database connection FAILED:", type(e).__name__, re.sub(r"password=\S+", "password=****", str(e))[:400])
'''
hr_ok = BACK / 'manage.py'
if hr_ok.exists():
    p = subprocess.run([sys.executable, 'manage.py', 'shell', '-c', code], cwd=BACK, capture_output=True, text=True, timeout=90)
    print(re.sub(r'(postgres(?:ql)?://[^:\s]+:)[^@\s]+@', r'\1****@', p.stdout + p.stderr)[-2500:])
