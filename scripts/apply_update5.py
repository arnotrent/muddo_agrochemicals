#!/usr/bin/env python3
"""Update 5 — edits to EXISTING files that can't be shipped whole. Run from repo root. Idempotent."""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0

home = ROOT / 'frontend/src/pages/public/HomePage.jsx'
if home.exists():
    t = home.read_text()
    new = '<ImageGallery title="Genuine MACL Products" subtitle="The real packs and boxes, exactly as they reach our shelves." />'
    if 'import ImageGallery' not in t:
        t = t.replace("import TestimonialsSection from '../../components/TestimonialsSection'\n",
                      "import TestimonialsSection from '../../components/TestimonialsSection'\nimport ImageGallery from '../../components/ImageGallery'\n", 1)
    if '<ImageGallery' in t:
        t = re.sub(r'<ImageGallery[^\n]*/>', new, t, count=1)           # replace the older multi-pool gallery
    elif '      <TestimonialsSection />\n' in t:
        t = t.replace('      <TestimonialsSection />\n', f'      {new}\n\n      <TestimonialsSection />\n', 1)
    else:
        print('!! HomePage.jsx: add  ' + new + '  above <TestimonialsSection /> by hand'); bad += 1
    home.write_text(t); print('OK HomePage.jsx')
else:
    print('!! HomePage.jsx not found'); bad += 1
sys.exit(1 if bad else 0)
