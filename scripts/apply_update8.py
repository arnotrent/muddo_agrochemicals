#!/usr/bin/env python3
"""Update 8 — admin Reviews route (404), uploads hardening, exact map pins. Run from the repo root after copying the
package files over:   python scripts/apply_update8.py      (idempotent; "!!" lines name an edit to make by hand)"""
import re, sys
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

def rx(rel, pattern, repl, marker):
    global bad
    t, p = _read(rel)
    if t is None: print(f'!! {rel} not found'); bad += 1; return
    if marker in t: print(f'-- {rel}: already applied ({marker[:40]})'); return
    new, n = re.subn(pattern, lambda m: repl, t, count=1, flags=re.S)
    if n != 1: print(f'!! {rel}: pattern not found ({marker}) — see the notes in the reply'); bad += 1; return
    p.write_text(new, encoding='utf-8'); print(f'OK {rel}')

# ── 1. THE 404: /admin/reviews had a sidebar link but no route, so it rendered the "Page Not Found" screen ──
edit('frontend/src/App.jsx', [
    ("const AdminTestimonialsPage = lazy(() => import('./pages/admin/AdminTestimonialsPage'))\n",
     "const AdminTestimonialsPage = lazy(() => import('./pages/admin/AdminTestimonialsPage'))\nconst AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'))\n", 'AdminReviewsPage = lazy'),
    ('                  <Route path="/admin/testimonials" element={<AdminTestimonialsPage />} />\n',
     '                  <Route path="/admin/testimonials" element={<AdminTestimonialsPage />} />\n                  <Route path="/admin/reviews" element={<AdminReviewsPage />} />\n', 'path="/admin/reviews"'),
])

# ── 2. maps: admin picker + public map use ONE exact-tip pin, and the picker opens ON the outlet being edited ──
LP = 'frontend/src/components/LocationPicker.jsx'
edit(LP, [("import Icon from './Icon'\n", "import Icon from './Icon'\nimport { makePin } from '../utils/mapPin'\n", 'import { makePin }')])
rx(LP, r"const pin = new L\.DivIcon\(\{.*?\n\}\)\n", "const pin = makePin('#38BDF8')\n", "makePin('#38BDF8')")
edit(LP, [
    ("  const sugAbort = useRef(null)\n",
     "  const sugAbort = useRef(null)\n"
     "  const pinHeld = useRef(has) // editing an existing outlet: show ITS pin first, not the district overview\n"
     "  const [latTxt, setLatTxt] = useState(has ? String(lat) : '')\n"
     "  const [lngTxt, setLngTxt] = useState(has ? String(lng) : '')\n"
     "  useEffect(() => { if (has) { setLatTxt(String(lat)); setLngTxt(String(lng)) } else { setLatTxt(''); setLngTxt('') } }, [lat, lng, has])\n"
     "  useEffect(() => { if (has) setFly({ lat, lng, zoom: 16, k: Date.now() }) }, []) // eslint-disable-line\n"
     "  const applyCoords = () => { const a = parseFloat(latTxt); const b = parseFloat(lngTxt); if (Number.isFinite(a) && Number.isFinite(b) && (a !== lat || b !== lng)) tryPlace(a, b, 16) }\n"
     "  const coordKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoords() } }\n", 'const pinHeld = useRef'),
    ("setFly({ box: r.box, lat: r.lat, lng: r.lng, zoom: town ? 15 : 12, k: Date.now() })",
     "if (!pinHeld.current) setFly({ box: r.box, lat: r.lat, lng: r.lng, zoom: town ? 15 : 12, k: Date.now() })", 'if (!pinHeld.current) setFly'),
    ("setArea(district || town ? { box: r.box, label: [town, district].filter(Boolean).join(', ') } : null)",
     "setArea(district || town ? { box: r.box, label: [town, district].filter(Boolean).join(', ') } : null)\n        pinHeld.current = false", 'pinHeld.current = false'),
])
rx(LP, r'<label className="text-xs font-semibold text-text-3">Latitude.*?</label>\s*<label className="text-xs font-semibold text-text-3">Longitude.*?</label>',
   '''<label className="text-xs font-semibold text-text-3">Latitude
          <input inputMode="decimal" value={latTxt} onChange={(e) => setLatTxt(e.target.value)} onBlur={applyCoords} onKeyDown={coordKey} placeholder="e.g. 0.313611" className={`${inputCls} w-full mt-1`} /></label>
        <label className="text-xs font-semibold text-text-3">Longitude
          <input inputMode="decimal" value={lngTxt} onChange={(e) => setLngTxt(e.target.value)} onBlur={applyCoords} onKeyDown={coordKey} placeholder="e.g. 32.581111" className={`${inputCls} w-full mt-1`} /></label>''',
   'onBlur={applyCoords}')
edit('frontend/src/pages/admin/AdminDistributorsPage.jsx', [
    ('<LocationPicker lat={form.lat}', "<LocationPicker key={editing ?? 'new'} lat={form.lat}", "key={editing ?? 'new'}")])

DP = 'frontend/src/pages/public/DistributorsPage.jsx'
edit(DP, [("import PageHero from '../../components/PageHero'\n", "import PageHero from '../../components/PageHero'\nimport { makePin } from '../../utils/mapPin'\n", 'import { makePin }')])
rx(DP, r"const pin = \(active\) => new L\.DivIcon\(\{.*?\n\}\)\n",
   "const PIN = makePin('#38BDF8')\nconst PIN_ACTIVE = makePin('#EF4444', 1.2)\nconst pin = (active) => (active ? PIN_ACTIVE : PIN)\n", 'PIN_ACTIVE')
edit(DP, [
    ("function FlyTo({ position }) {",
     "// Frames every outlet that matches the current filters (so what you filter is what you see on the map).\n"
     "function FitAll({ points }) {\n  const map = useMap()\n  const key = points.map((p) => p.join(',')).join('|')\n"
     "  useEffect(() => {\n    if (!points.length) return\n    if (points.length === 1) map.setView(points[0], 13)\n    else map.fitBounds(points, { padding: [40, 40], maxZoom: 12 })\n  }, [key, map]) // eslint-disable-line\n  return null\n}\n\n"
     "function FlyTo({ position }) {", 'function FitAll'),
    ("map.setView(position, 14, { animate: true })", "map.setView(position, 16, { animate: true })", 'map.setView(position, 16'),
    ("{sel && <FlyTo position={[sel.lat, sel.lng]} />}",
     "{sel ? <FlyTo position={[sel.lat, sel.lng]} /> : <FitAll points={filtered.filter((d) => d.lat && d.lng).map((d) => [d.lat, d.lng])} />}", '<FitAll points'),
    ('{sel.address && <p className="text-sm text-text-2 mb-2 flex gap-2"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{sel.address}</p>}',
     '{sel.address && <p className="text-sm text-text-2 mb-2 flex gap-2"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{sel.address}</p>}\n'
     '                  <p className="text-xs text-text-4 mb-2 font-mono" title="Exact pin the administrator set">Pin: {Number(sel.lat).toFixed(6)}, {Number(sel.lng).toFixed(6)}</p>', 'Exact pin the administrator set'),
])

print('\nAll update-8 edits applied.' if not bad else f'\n{bad} edit(s) need to be made by hand — see the "!!" lines above.')
sys.exit(1 if bad else 0)
