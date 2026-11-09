#!/usr/bin/env python3
"""Run from the repo root:  python scripts/check_wiring.py
Fails (exit 1) if an /admin/... or /portal/... link in the layouts has no <Route> in App.jsx - the exact mistake that
turns a sidebar link into the public 'Page not found' screen (it has happened with Reviews more than once).
Also lists every frontend API path under /admin/ that no Django urls file mentions."""
import re, sys
from pathlib import Path

ROOT = Path.cwd()
fe = ROOT / 'frontend' / 'src'
app = (fe / 'App.jsx').read_text(encoding='utf-8')
routes = set(re.findall(r'path=["\']([^"\']+)["\']', app))
links = {}
for f in (fe / 'layouts').glob('*.jsx'):
    for m in re.findall(r'["\'](/(?:admin|portal)/[a-z0-9\-/]*[a-z0-9])["\']', f.read_text(encoding='utf-8')):
        links.setdefault(m, f.name)
bad = 0
for link, src in sorted(links.items()):
    ok = link in routes or any(re.fullmatch(re.sub(r':[^/]+', '[^/]+', r), link) for r in routes)
    print(('OK  ' if ok else 'MISSING ROUTE  ') + f'{link}   (linked from {src})')
    bad += not ok

urls = ' '.join(p.read_text(encoding='utf-8') for p in (ROOT / 'backend').rglob('urls*.py'))
api = set()
for p in fe.rglob('*.js*'):
    api |= set(re.findall(r'["\'`](/admin/[a-z0-9\-/]+/)["\'`]', p.read_text(encoding='utf-8')))
for a in sorted(api):
    pat = a.strip('/')
    if pat not in urls:
        print(f'WARN  API path {a} is called by the frontend but not found in any backend urls*.py'); bad += 1
print('\nWiring OK' if not bad else f'\n{bad} problem(s) found')
sys.exit(1 if bad else 0)
