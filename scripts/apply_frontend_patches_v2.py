#!/usr/bin/env python3
"""Round-2 frontend edits to EXISTING files. Run from repo root. Idempotent and strict."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0

def edit(rel, steps):
    global bad
    p = ROOT / rel
    if not p.exists():
        print(f'!! {rel} not found'); bad += 1; return
    t = p.read_text(); changed = False
    for old, new, marker in steps:
        if marker in t:
            print(f'-- {rel}: already applied ({marker[:36]})'); continue
        if t.count(old) != 1:
            print(f'!! {rel}: anchor not found exactly once — edit by hand:\n   {old[:140]!r}'); bad += 1; continue
        t = t.replace(old, new); changed = True
    if changed:
        p.write_text(t); print(f'OK {rel}')

IMP_HERO = "import PageHero from '../../components/PageHero'\n"

edit('frontend/src/layouts/PublicLayout.jsx', [
  ("import site from '../data/siteConfig'\n", "import site from '../data/siteConfig'\nimport { PhoneLinks, EmailLinks } from '../components/ContactDetails'\n", 'PhoneLinks, EmailLinks'),
  ('''                <li className="flex gap-2"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{site.company_address}</li>
                <li className="flex gap-2"><Icon name="phone" className="text-accent-blue mt-0.5" /><a href={`tel:${site.company_phone}`}>{site.company_phone}</a></li>
                <li className="flex gap-2"><Icon name="envelope" className="text-accent-blue mt-0.5" /><a href={`mailto:${site.company_email}`}>{site.company_email}</a></li>''',
   '''                <li className="flex gap-2"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{site.company_address}</li>
                <li className="flex gap-2"><Icon name="building" className="text-accent-blue mt-0.5" />{site.company_po_box}</li>
                <li className="flex gap-2"><Icon name="phone" className="text-accent-blue mt-0.5" /><PhoneLinks /></li>
                <li className="flex gap-2"><Icon name="envelope" className="text-accent-blue mt-0.5" /><EmailLinks /></li>''', '<PhoneLinks />'),
])

edit('frontend/src/pages/public/ContactPage.jsx', [
  ("import Icon from '../../components/Icon'\n", "import Icon from '../../components/Icon'\nimport { PhoneLinks, EmailLinks } from '../../components/ContactDetails'\n", 'PhoneLinks, EmailLinks'),
  ('''              ['map-marker-alt', 'Visit us in Kampala', site.company_address],
              ['phone', 'Call or WhatsApp us', site.company_phone],
              ['envelope', 'Email the team', site.company_email],''',
   '''              ['map-marker-alt', 'Visit us in Kampala', site.company_address],
              ['building', 'Postal address', site.company_po_box],
              ['phone', 'Call or WhatsApp us', <PhoneLinks key="p" />],
              ['envelope', 'Email the team', <EmailLinks key="e" />],''', '<PhoneLinks key="p" />'),
])

edit('frontend/src/pages/public/AboutPage.jsx', [
  ("import Icon from '../../components/Icon'\n", "import Icon from '../../components/Icon'\nimport { PhoneLinks, EmailLinks } from '../../components/ContactDetails'\n", 'PhoneLinks, EmailLinks'),
  ("Based in Kampala's {site.company_address}, MACL", "Based at {site.company_address}, MACL", 'Based at {site.company_address}'),
  ('''              <Icon name="phone" className="text-accent-blue mr-1.5" /><strong>Tel:</strong> {site.company_phone}<br />
              <Icon name="envelope" className="text-accent-blue mr-1.5" /><strong>Email:</strong>{' '}
              <a href={`mailto:${site.company_email}`} className="text-accent-blue">{site.company_email}</a>''',
   '''              <Icon name="building" className="text-accent-blue mr-1.5" /><strong>P.O. Box:</strong> {site.company_po_box}<br />
              <Icon name="phone" className="text-accent-blue mr-1.5" /><strong>Tel:</strong> <PhoneLinks inline /><br />
              <Icon name="envelope" className="text-accent-blue mr-1.5" /><strong>Email:</strong> <EmailLinks inline className="text-accent-blue" />''', '<PhoneLinks inline />'),
])

edit('frontend/src/pages/public/TrackPage.jsx', [
  ("import Icon from '../../components/Icon'\n", "import Icon from '../../components/Icon'\n" + IMP_HERO, 'PageHero'),
  ('''      <section className="py-10" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-[620px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-bold text-white my-3">Track Your Enquiry</h1>
          <p className="text-white/85">Enter your reference number to check your enquiry status.</p>
        </div>
      </section>''',
   '''      <PageHero
        bg="/images/field_crops_collage.jpg" tone="deep"
        side={{ src: '/images/field_pests_caterpillars.jpg', alt: 'Caterpillar pests on crop leaves', caption: 'Describe the pest, we reply with the right product.', w: 929, h: 377 }}
        crumbs={[['Home', '/'], ['Track Enquiry']]} eyebrow="Enquiry status" icon={<Icon name="clock" />}
        title="Track Your Enquiry" subtitle="Enter your reference number to check your enquiry status."
      />''', '<PageHero'),
])

edit('frontend/src/pages/public/ComparePage.jsx', [
  ("import Icon from '../../components/Icon'\n", "import Icon from '../../components/Icon'\n" + IMP_HERO, 'PageHero'),
  ("  ['Stock', (p) => p.stock_status === 'in' ? 'In Stock' : p.stock_status === 'low' ? 'Low Stock' : 'Out of Stock'],",
   "  ['Stock', (p) => p.stock_status === 'featured' ? 'Coming Soon' : p.stock_status === 'in' ? 'In Stock' : p.stock_status === 'low' ? 'Low Stock' : 'Out of Stock'],", "'Coming Soon'"),
  ('''      <section className="py-10" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-bold text-white my-3">Compare Products</h1>
          <p className="text-white/85 max-w-[52ch]">Select up to 3 products to compare their specifications side by side.</p>
        </div>
      </section>''',
   '''      <PageHero
        bg="/images/hero_range_1200.jpg" bgSet="/images/hero_range_1200.jpg 1200w, /images/hero_range_2400.jpg 2400w"
        side={{ src: '/images/field_pesticide_fungicide_range.jpg', alt: 'M-D Thion, TOP-LAXLY M and M-D Acelemectin products', caption: 'Compare active ingredients, crops and pack sizes side by side.', w: 951, h: 849 }}
        crumbs={[['Home', '/'], ['Compare Products']]} eyebrow="Side by side" icon={<Icon name="balance-scale" />}
        title="Compare Products" subtitle="Select up to 3 products to compare their specifications side by side."
      />''', '<PageHero'),
])

edit('frontend/src/pages/public/SearchPage.jsx', [
  ("import Icon from '../../components/Icon'\n", "import Icon from '../../components/Icon'\n" + IMP_HERO, 'PageHero'),
  ('''      <section className="py-10" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-bold text-white my-3">Search Results</h1>
        </div>
      </section>''',
   '''      <PageHero
        bg="/images/field_crops_collage.jpg" tone="deep" narrow
        crumbs={[['Home', '/'], ['Search']]} eyebrow="Catalogue search" icon={<Icon name="search" />}
        title="Search Results" subtitle="Find products by name, active ingredient or the crop they protect."
      />''', '<PageHero'),
])

edit('frontend/src/data/faqs.js', [(
  "answer: 'Our main outlet is located at Container Village in Nakivubo, Kampala. You can find us in the Equity Bank Basement (Room V013) or via the Venus Plaza Basement entrance.',",
  "answer: 'Our main outlet is at Basement Room V013, Venus Plaza, Container Village, Nakivubo Place, Kampala Central Division. Our postal address is P.O. Box 25240, Kampala.',",
  'Basement Room V013, Venus Plaza')])

edit('frontend/src/App.jsx', [
  ("import { RequireRole } from './routes/guards'\n", "import { RequireRole } from './routes/guards'\nimport ConnectionBanner from './components/ConnectionBanner'\n", 'ConnectionBanner'),
  ("const AdminLeadershipPage = lazy(() => import('./pages/admin/AdminLeadershipPage'))\n",
   "const AdminLeadershipPage = lazy(() => import('./pages/admin/AdminLeadershipPage'))\nconst AdminTestimonialsPage = lazy(() => import('./pages/admin/AdminTestimonialsPage'))\n", 'AdminTestimonialsPage'),
  ('                  <Route path="/admin/leadership" element={<AdminLeadershipPage />} />\n',
   '                  <Route path="/admin/leadership" element={<AdminLeadershipPage />} />\n                  <Route path="/admin/testimonials" element={<AdminTestimonialsPage />} />\n', '/admin/testimonials'),
  ("        <BrowserRouter>\n          <Suspense fallback={<RouteLoader />}>", "        <BrowserRouter>\n          <ConnectionBanner />\n          <Suspense fallback={<RouteLoader />}>", '<ConnectionBanner />'),
])
sys.exit(1 if bad else 0)
