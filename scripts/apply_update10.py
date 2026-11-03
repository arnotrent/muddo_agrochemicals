#!/usr/bin/env python3
"""Update 10 — Google Maps place picking (stores the Google place id), "not yet in stock" wording.
Run from the repo root after copying the package files:   python scripts/apply_update10.py   (idempotent)"""
import sys
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
        if t.count(old) != 1: print(f'!! {rel}: anchor not found exactly once — edit by hand:\n   {old[:170]!r}'); bad += 1; continue
        t = t.replace(old, new); ch = True
    if ch: p.write_text(t, encoding='utf-8'); print(f'OK {rel}')

def migration(app, slug, body):
    global bad
    d = ROOT / 'backend' / 'apps' / app / 'migrations'
    if not d.exists(): print(f'!! {d} not found'); bad += 1; return
    if list(d.glob(f'*_{slug}.py')): print(f'-- {app}: migration {slug} already exists'); return
    prev = sorted(p.stem for p in d.glob('[0-9][0-9][0-9][0-9]_*.py'))[-1]
    n = int(prev[:4]) + 1
    (d / f'{n:04d}_{slug}.py').write_text(body.replace('__PREV__', prev), encoding='utf-8')
    print(f'OK {app}: created migration {n:04d}_{slug} (after {prev})')

# 1. distributors remember the Google place the admin picked
edit('backend/apps/distributors/models.py', [(
    "    lng      = models.FloatField(default=0.0)\n",
    "    lng      = models.FloatField(default=0.0)\n    # Google Places id when the admin picked a real Google place (lets Google show the business name); '' for a plain pin\n    place_id = models.CharField(max_length=300, blank=True)\n",
    'place_id = models.CharField')])
edit('backend/apps/distributors/serializers.py', [(
    "'phone', 'email', 'lat', 'lng', 'created_at']", "'phone', 'email', 'lat', 'lng', 'place_id', 'created_at']", "'lng', 'place_id'")])
migration('distributors', 'update10_place_id', '''from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('distributors', '__PREV__')]
    operations = [
        migrations.AddField(model_name='distributor', name='place_id', field=models.CharField(blank=True, max_length=300)),
    ]
''')

# 2. featured products read "Not yet in stock" everywhere (never "out of stock")
edit('frontend/src/components/ProductCard.jsx', [("text: 'Featured — Coming Soon'", "text: 'Not yet in stock'", "text: 'Not yet in stock'")])
edit('frontend/src/pages/public/ProductDetailPage.jsx', [('<Icon name="star" />Featured — Coming Soon</span>', '<Icon name="star" />Not yet in stock</span>', '<Icon name="star" />Not yet in stock')])
edit('frontend/src/pages/admin/AdminInventoryPage.jsx', [("'bg-accent-green/15 text-accent-green', 'Coming Soon']", "'bg-accent-green/15 text-accent-green', 'Not yet in stock']", "'Not yet in stock']")])

print('\nAll update-10 edits applied.' if not bad else f'\n{bad} edit(s) need to be made by hand — see the "!!" lines above.')
sys.exit(1 if bad else 0)
