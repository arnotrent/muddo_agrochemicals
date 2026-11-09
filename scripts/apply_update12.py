#!/usr/bin/env python3
"""Update 12 - run from the repo root AFTER apply_update11.py:  python scripts/apply_update12.py  (idempotent, strict)"""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0

def edit(rel, steps):
    global bad
    p = ROOT / rel
    if not p.exists(): print(f'!! {rel} not found'); bad += 1; return
    t = p.read_text(encoding='utf-8'); ch = False
    for old, new, marker in steps:
        if marker in t: print(f'-- {rel}: already applied ({marker[:36]})'); continue
        if t.count(old) != 1: print(f'!! {rel}: anchor not found exactly once - edit by hand:\n   {old[:150]!r}'); bad += 1; continue
        t = t.replace(old, new); ch = True
    if ch: p.write_text(t, encoding='utf-8'); print(f'OK {rel}')

# distributors remember the Google place id
edit('backend/apps/distributors/models.py', [(
    "    lng      = models.FloatField(default=0.0)\n",
    "    lng      = models.FloatField(default=0.0)\n    place_id = models.CharField(max_length=300, blank=True)  # Google place id when picked from Google, else ''\n", 'place_id = models')])

# newsletter consent fields + status
edit('backend/apps/core/models.py', [(
    "    active = models.BooleanField(default=True); subscribed_at = models.DateTimeField(auto_now_add=True)\n",
    "    active = models.BooleanField(default=True); subscribed_at = models.DateTimeField(auto_now_add=True)\n"
    "    consent_at = models.DateTimeField(null=True, blank=True)\n    confirmed_at = models.DateTimeField(null=True, blank=True)\n"
    "    unsubscribed_at = models.DateTimeField(null=True, blank=True)\n    source = models.CharField(max_length=30, blank=True, default='')\n\n"
    "    @property\n    def status(self):\n        if self.active: return 'subscribed'\n        return 'unsubscribed' if self.unsubscribed_at else 'pending'\n", 'consent_at = models')])
edit('backend/apps/core/serializers.py', [(
    "        fields = ['id', 'email', 'name', 'active', 'subscribed_at']\n        read_only_fields = ['id', 'active', 'subscribed_at']",
    "        fields = ['id', 'email', 'name', 'active', 'status', 'subscribed_at', 'consent_at', 'confirmed_at', 'source']\n        read_only_fields = ['id', 'active', 'status', 'subscribed_at', 'consent_at', 'confirmed_at', 'source']", "'consent_at', 'confirmed_at', 'source']")])
edit('backend/apps/core/urls_api.py', [
    ('from apps.core import api_views as v\n', 'from apps.core import api_views as v\nfrom apps.core import newsletter as nl\n', 'import newsletter as nl'),
    ("    path('newsletter/subscribe/', v.subscribe_view, name='api_newsletter_subscribe'),\n",
     "    path('newsletter/subscribe/', nl.subscribe_view, name='api_newsletter_subscribe'),\n"
     "    path('newsletter/confirm/', nl.confirm_view, name='api_newsletter_confirm'),\n"
     "    path('newsletter/unsubscribe/', nl.unsubscribe_view, name='api_newsletter_unsubscribe'),\n", 'nl.confirm_view')])

# spec-sheet PDF: escape text (an "&" or "<" in a description crashed the PDF) + copyright line
edit('backend/apps/products/api_views.py', [
    ('from django.http import FileResponse\n', 'from django.http import FileResponse\nfrom xml.sax.saxutils import escape\n', 'import escape'),
    ("Paragraph(f'<b>{p.name}</b>', h1)", "Paragraph(f'<b>{escape(p.name)}</b>', h1)", 'escape(p.name)'),
    ("Paragraph(p.description, ParagraphStyle(", "Paragraph(escape(p.description), ParagraphStyle(", 'escape(p.description)'),
    ("Paragraph(v, bd)] for k, v in specs]", "Paragraph(escape(str(v)), bd)] for k, v in specs]", 'escape(str(v))'),
    ("Paragraph('Informational only. Always refer to the registered product label.', sm)",
     "Paragraph('Informational only. Always refer to the registered product label. \\u00a9 Muddo Agro Chemicals LTD. All rights reserved.', sm)", 'All rights reserved.')])

# frontend wiring
edit('frontend/src/api/services.js', [(
    "  subscribe: (email, name = '') => api.post('/newsletter/subscribe/', { email, name }),",
    "  subscribe: ({ email, name = '', consent = false, website = '' }) => api.post('/newsletter/subscribe/', { email, name, consent, website }),", 'consent = false')])
edit('frontend/src/App.jsx', [
    ("const SearchPage = lazy(() => import('./pages/public/SearchPage'))\n",
     "const SearchPage = lazy(() => import('./pages/public/SearchPage'))\nconst LegalPage = lazy(() => import('./pages/public/LegalPage'))\nconst NewsletterPage = lazy(() => import('./pages/public/NewsletterPage'))\n", 'LegalPage = lazy'),
    ('<Route path="/compare" element={<ComparePage />} />',
     '<Route path="/compare" element={<ComparePage />} />\n                <Route path="/legal/:doc" element={<LegalPage />} />\n                <Route path="/newsletter/:action" element={<NewsletterPage />} />', 'path="/legal/:doc"')])
edit('frontend/src/layouts/PublicLayout.jsx', [
    ("import site from '../data/siteConfig'\n", "import site from '../data/siteConfig'\nimport NewsletterSignup from '../components/NewsletterSignup'\n", 'NewsletterSignup from'),
    ('<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">', '<NewsletterSignup />\n          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">', '<NewsletterSignup />'),
    ('<div className="border-t border-white/10 py-4 flex justify-between flex-wrap gap-2 text-xs text-white/40"><p>&copy; {new Date().getFullYear()} Muddo Agro Chemicals LTD. All Rights Reserved.</p></div>',
     '<div className="border-t border-white/10 py-4 flex justify-between flex-wrap gap-x-6 gap-y-2 text-xs text-white/50">\n'
     '            <p>&copy; {new Date().getFullYear() > 2026 ? `2026\u2013${new Date().getFullYear()}` : \'2026\'} Muddo Agro Chemicals LTD. All rights reserved. MUDDO AGRO, MACL and our product names and logo are trade names of Muddo Agro Chemicals LTD.</p>\n'
     '            <p className="flex gap-4"><Link to="/legal/copyright" className="hover:text-accent-blue">Copyright &amp; Licence</Link><Link to="/legal/terms" className="hover:text-accent-blue">Terms</Link><Link to="/legal/privacy" className="hover:text-accent-blue">Privacy</Link></p>\n          </div>', 'Copyright &amp; Licence')])
edit('frontend/src/layouts/AdminLayout.jsx', [("label: 'Import CSV'", "label: 'Bulk Import'", "label: 'Bulk Import'")])
edit('frontend/index.html', [(
    '  <link rel="icon" type="image/png" href="/logo_icon.png" />',
    '  <meta name="author" content="Muddo Agro Chemicals LTD" />\n  <meta name="copyright" content="(c) Muddo Agro Chemicals LTD. All rights reserved." />\n  <meta name="rights" content="All rights reserved. See /legal/copyright" />\n  <link rel="icon" type="image/png" href="/logo_icon.png" />', 'name="copyright"')])

print('\nAll update-12 edits applied.' if not bad else f'\n{bad} edit(s) need to be made by hand - see the "!!" lines.')
sys.exit(1 if bad else 0)
