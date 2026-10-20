#!/usr/bin/env python3
"""Update 3 — the few small edits to EXISTING files that can't be shipped whole. Run from repo root AFTER
`python scripts/apply_all.py`. Idempotent; stops with the exact manual edit if an anchor has drifted."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0

def edit(rel, steps):
    global bad
    p = ROOT / rel
    if not p.exists():
        print(f'!! {rel} not found'); bad += 1; return
    t = p.read_text(); ch = False
    for old, new, marker in steps:
        if marker in t:
            print(f'-- {rel}: already applied ({marker})'); continue
        if t.count(old) != 1:
            print(f'!! {rel}: anchor not found exactly once — edit by hand:\n   {old!r}'); bad += 1; continue
        t = t.replace(old, new); ch = True
    if ch: p.write_text(t); print(f'OK {rel}')

edit('frontend/src/pages/public/HomePage.jsx', [
  ("import TestimonialsSection from '../../components/TestimonialsSection'\n",
   "import TestimonialsSection from '../../components/TestimonialsSection'\nimport ImageGallery from '../../components/ImageGallery'\n", "import ImageGallery"),
  ("      <TestimonialsSection />\n",
   "      <ImageGallery pool={['field', 'banner']} title=\"From Our Fields and Shelves\" subtitle=\"Real photographs of MACL products and the crops they protect.\" />\n\n      <TestimonialsSection />\n", "<ImageGallery pool"),
])
edit('frontend/src/pages/admin/AdminSettingsPage.jsx', [
  ("import Icon from '../../components/Icon'\n", "import Icon from '../../components/Icon'\nimport AdminEmailCard from '../../components/AdminEmailCard'\n", "import AdminEmailCard"),
  ("      {sysinfo && (\n", "      <AdminEmailCard />\n\n      {sysinfo && (\n", "<AdminEmailCard />"),
])
sys.exit(1 if bad else 0)
