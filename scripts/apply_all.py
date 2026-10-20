#!/usr/bin/env python3
"""Runs every patch script in order. From the repo root:  python scripts/apply_all.py"""
import subprocess, sys
from pathlib import Path
here = Path(__file__).resolve().parent
rc = 0
for name in ('apply_backend_patches.py', 'apply_frontend_patches.py', 'apply_backend_patches_v2.py', 'apply_frontend_patches_v2.py'):
    print(f'\n=== {name} ===')
    rc |= subprocess.call([sys.executable, str(here / name)])
print('\nAll patches applied.' if rc == 0 else '\nSome edits need to be made by hand — see the "!!" lines above.')
sys.exit(rc)
