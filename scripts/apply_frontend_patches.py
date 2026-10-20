#!/usr/bin/env python3
"""Small edits to EXISTING frontend files. Run from repo root: python scripts/apply_frontend_patches.py
Idempotent and strict (stops with the exact manual edit if an anchor has drifted)."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

E = [
 ('frontend/src/pages/public/ProductCategoryPage.jsx', [
  ("import Reveal from '../../components/Reveal'\n",
   "import Reveal from '../../components/Reveal'\nimport FieldGallery from '../../components/FieldGallery'\nimport { PHOTOS } from '../../data/fieldPhotos'\n", "FieldGallery"),
  ("      </section>\n    </>\n  )\n}",
   "      </section>\n\n      <FieldGallery\n        photos={PHOTOS[meta.category]}\n        title={`${meta.title} in the Field`}\n        subtitle=\"Real MACL products and the crops and pests they are used on.\"\n      />\n    </>\n  )\n}", "<FieldGallery"),
 ]),
 ('frontend/src/pages/public/ProductDetailPage.jsx', [
  ("import site from '../../data/siteConfig'\n",
   "import site from '../../data/siteConfig'\nimport ReviewsSection from '../../components/ReviewsSection'\nimport FieldGallery from '../../components/FieldGallery'\nimport { photosForProduct } from '../../data/fieldPhotos'\n", "ReviewsSection"),
  ("        {related.length > 0 && (",
   "        <ReviewsSection productId={product.id} />\n\n        {related.length > 0 && (", "<ReviewsSection productId"),
  ("      </div>\n    </section>\n  )\n}",
   "      </div>\n      <FieldGallery photos={photosForProduct(product.name)} title=\"Seen in the Field\" />\n    </section>\n  )\n}", "<FieldGallery photos"),
 ]),
 ('frontend/src/pages/public/AboutPage.jsx', [
  ("import Icon from '../../components/Icon'\n",
   "import Icon from '../../components/Icon'\nimport LeadershipSection from '../../components/LeadershipSection'\n", "LeadershipSection'"),
  ("      <section className=\"py-14\">\n        <div className=\"max-w-[860px] mx-auto px-4 sm:px-6\">",
   "      <LeadershipSection />\n\n      <section className=\"py-14\">\n        <div className=\"max-w-[860px] mx-auto px-4 sm:px-6\">", "<LeadershipSection />"),
 ]),
 ('frontend/src/App.jsx', [
  ("const AdminSiteContentPage = lazy(() => import('./pages/admin/AdminSiteContentPage'))\n",
   "const AdminSiteContentPage = lazy(() => import('./pages/admin/AdminSiteContentPage'))\nconst AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'))\nconst AdminLeadershipPage = lazy(() => import('./pages/admin/AdminLeadershipPage'))\n", "AdminReviewsPage"),
  ("                  <Route path=\"/admin/site-content\" element={<AdminSiteContentPage />} />\n",
   "                  <Route path=\"/admin/site-content\" element={<AdminSiteContentPage />} />\n                  <Route path=\"/admin/reviews\" element={<AdminReviewsPage />} />\n                  <Route path=\"/admin/leadership\" element={<AdminLeadershipPage />} />\n", "/admin/reviews"),
 ]),
 ('frontend/src/layouts/AdminLayout.jsx', [
  ("  { to: '/admin/requests', icon: 'envelope', label: 'Enquiries' },\n",
   "  { to: '/admin/requests', icon: 'envelope', label: 'Enquiries' },\n  { to: '/admin/reviews', icon: 'star', label: 'Reviews' },\n  { to: '/admin/leadership', icon: 'award', label: 'Leadership' },\n", "'/admin/reviews'"),
 ]),
 ('frontend/tailwind.config.js', [
  ("        revealUp: { from: { opacity: 0, transform: 'translateY(22px)' }, to: { opacity: 1, transform: 'none' } },\n",
   "        revealUp: { from: { opacity: 0, transform: 'translateY(22px)' }, to: { opacity: 1, transform: 'none' } },\n        msgIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },\n        viewerIn: { from: { opacity: 0, transform: 'scale(.95)' }, to: { opacity: 1, transform: 'scale(1)' } },\n        drawerIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },\n", "msgIn:"),
  ("        revealUp: 'revealUp 600ms cubic-bezier(.22,1,.36,1) both',\n",
   "        revealUp: 'revealUp 600ms cubic-bezier(.22,1,.36,1) both',\n        msgIn: 'msgIn 250ms ease-out both',\n        viewerIn: 'viewerIn 200ms ease-out both',\n        drawerIn: 'drawerIn 250ms cubic-bezier(.22,1,.36,1) both',\n", "msgIn 250ms"),
 ]),
]
bad = 0
for rel, edits in E:
    p = ROOT / rel
    if not p.exists(): print(f'!! {rel} not found'); bad += 1; continue
    t = p.read_text(); ch = False
    for old, new, marker in edits:
        if marker in t: print(f'-- {rel}: already applied ({marker})'); continue
        if t.count(old) != 1: print(f'!! {rel}: anchor not found exactly once — edit by hand:\n{old!r}'); bad += 1; continue
        t = t.replace(old, new); ch = True
    if ch: p.write_text(t); print(f'OK {rel}')
sys.exit(1 if bad else 0)
