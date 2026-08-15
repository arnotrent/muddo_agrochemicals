# Muddo Agro Chemicals LTD — Django DRF API + React SPA

Two independently deployable projects:

```
backend/    Django + Django REST Framework API (merge into your existing repo — see backend/MERGE_INSTRUCTIONS.md)
frontend/   React + Vite + Tailwind + React Router SPA (new, standalone)
```

## Status
- Backend: full DRF API layer (serializers, views, urls, JWT auth, permissions) built against your existing models/migrations. Not yet merged into your live repo — follow `backend/MERGE_INSTRUCTIONS.md`.
- Frontend: builds cleanly (`npm run build` verified). Public site, agent portal, and admin panel are all wired to the real API endpoints above. No mock data anywhere — every page fetches from `/api/v1/...`.

## Images — status: DONE, real photography is in
All real images you sent are placed under `frontend/public/` and `frontend/public/images/` and are wired into the actual pages (not just sitting there unused):

- **Logo** — `public/logo_full.png` uses your letterhead/business-card asset (the ChatGPT-generated one), since it's the clean definitive brand mark.
- **Homepage** — hero (`hero_home.jpg`), category tiles, and a real "Field-Tested" photo pair (`why_quality.jpg` + `why_equipment.jpg`) restored from the original design.
- **Product category pages** — real hero photography per category (`hero_pesticides.jpg`, `hero_herbicides.jpg`, `hero_fungicides.jpg`).
- **About page** — hero banner, a trust/handshake strip, and the "Who We Are" photo now uses the real greenhouse tomato shot (`about_side.jpg`) instead of a placeholder wordmark.
- **Contact page** — real hero banner (`hero_contact_banner.png`).
- **Login page** — now a genuine 4-slide auto-advancing carousel (Pesticides → Herbicides → Fungicides → Fertilizers), matching the original site's feature, using your real category photos.
- **Admin & Agent dashboards** — real branded banners (`banner_admin.png`, `banner_agent.png`) at the top of each, restored from the original design.
- **Products** — every seeded product now points at its real uploaded photo (`product_muddosate.jpg`, `product_acelemectin.jpg`, etc.) via an updated `seed_data.py`.

### One thing I changed and want to flag, not hide
Your image set didn't include a "Fertilizers & Equipment" category hero — I used `sprayer_field_application.png` (renamed to `hero_fertilizers.jpg`) since it's the closest thematic fit (equipment, in-field). If you'd rather use something else there, it's a one-file swap.

### One real gap, not silently patched
**NPK 17:17:17** has no uploaded product photo. `seed_data.py` currently points it at `products_all.jpg` (the same generic fallback the rest of the site already uses for any missing product image) rather than a broken path. Send a real photo whenever you have one and it's a one-line swap in `seed_data.py`.

### Unused-but-available assets
Your batch included several marketing flyers (`flyer_*.png`), packaging shots (`photo_boxes_*.png`, `photo_*_plain.png`, `photo_toplaxlyn_bag.png`), and standalone pest/crop photography (`pest_collage_*.png`, `pest_whitefly.jpg`, `tomato_*.png`, `tomatoes_greenhouse.png`, `photo_rollup_banner.png`, `photo_shop_shelf.png`, `photo_ourproducts_collage.png`) that aren't wired into any page yet — they're all copied into `frontend/public/images/` so they're available if you want a "downloads" section, a product gallery with multiple photos, or a blog/news section later.

## Round 3 fixes (this update)

**Critical bug, now fixed:** Tailwind spacing values like `w-11.5`, `gap-4.5`, `p-6.5` used throughout the components aren't in Tailwind's default scale — they silently generate **zero CSS**, which is what caused the collapsed spacing, missing card borders, and broken layout in your screenshots. Fixed by extending the Tailwind config to generate the full half-integer spacing scale globally (`tailwind.config.js`), rather than hunting down and hand-editing every occurrence across ~40 files. Also fixed a matching bug (`duration-600`, not a valid Tailwind duration step) in the scroll-reveal animation.

**Deploy failure, now fixed:** Render couldn't find `manage.py` because the backend package only ever shipped the new API-layer files, on the assumption you'd merge them into an existing repo by hand. Since you're deploying `backend/` as its own service root, it's now a **complete standalone Django project** — every model, migration, admin config, and management command reconstructed and verified (see `backend/MERGE_INSTRUCTIONS.md` for the full account, and the verification log below).

**Content changes, as requested:**
- FAQs and company contact details (phone, email, address, hours) are now **static, baked into the frontend** (`src/data/faqs.js`, `src/data/siteConfig.js`) — no longer fetched from the backend, no longer editable through the admin panel. This also removes a network round-trip from every page load.
- The admin "Site Content" page/route has been removed accordingly.
- Logo split into two assets: `public/logo_icon.png` (the real circular MACL mark you sent — used everywhere small: navbar, sidebars, login) and `public/logo_full.png` (the letterhead/business card — now shown prominently in its own bordered container on the homepage, between the hero and the product categories).
- Homepage hero text is explicitly left-aligned.
- Fixed the "MACL Difference" section — restored the missing subtitle line and fixed the broken card layout (same root cause as the spacing bug above).

**Speed and animation, as requested:**
- Route-based code splitting (`React.lazy` per page) — the homepage now loads ~270KB of JS instead of the previous single ~712KB bundle; Leaflet and Chart.js only download on the pages that actually use them.
- Restored: scroll-reveal-on-view for cards and sections, a page fade-in on every route change, animated count-up numbers on the homepage stats, a scroll-progress bar, and a back-to-top button — all present in the original site and dropped in the first React pass.

## Backend fix that came out of the image work
Seeded `image_url` values previously pointed at `/static/images/...` — a path that only made sense when Django rendered the templates itself. Now that the frontend is a separate origin, I:
1. Updated `seed_data.py` to use `/images/...` (matching the React app's own `public/images/` convention).
2. Fixed the DRF product serializer so it only absolutizes image URLs that are actually served by the Django backend (`MEDIA_URL`-prefixed, i.e. real uploaded files) — plain `/images/...` paths from seed data are left untouched so the browser resolves them against the frontend's own origin instead of incorrectly trying the API's domain.

## Running locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your Supabase DATABASE_URL + a real SECRET_KEY
python manage.py migrate
python manage.py seed_data
python manage.py runserver          # http://127.0.0.1:8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL should point at the backend above
npm run dev            # http://localhost:5173
```

Log in at `/login` with your existing admin/agent seed credentials —
the login screen now hits `/api/v1/auth/login/` and gets back a JWT pair,
no more Django session cookies.

## Page coverage (React)
**Public:** Home, Product category (pesticides/herbicides/fungicides/other), Product detail, Contact, Distributors (Leaflet map), About + FAQ, Track enquiry, Search, Compare, Login, 404.
**Agent portal:** Dashboard (supply requests), Chat, Profile.
**Admin panel:** Dashboard (Chart.js), Products CRUD, Inventory, Distributors CRUD, Enquiries, Supply Requests, Agents, Chat, Site Content + FAQ, Newsletter, CSV Import, Settings (password change, agent password reset, system info).

Every one of these pages calls the real `/api/v1/...` endpoints — no mock data anywhere.

## What's next
- Drop in real images (see above) and the site will look complete immediately — all image paths are already wired.
- Production deploy: backend to Render/Railway (Postgres via Supabase already wired), frontend to Cloudflare Pages/Netlify/Vercel as a static build (`npm run build` → `dist/`), pointed at the deployed API via `VITE_API_BASE_URL`.
- Optional polish once you've reviewed: code-splitting the frontend bundle (currently one ~700KB chunk — Vite warns about this but it's not broken, just not optimally lazy-loaded), and deleting the now-dead Django template files per `backend/MERGE_INSTRUCTIONS.md` section 3 once you're confident the React pages cover everything you need.
