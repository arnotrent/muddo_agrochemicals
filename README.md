# Muddo Agro Chemicals LTD — Web Platform

Uganda's MAAIF-registered agrochemical distributor. Decoupled architecture:
a Django + Django REST Framework JSON API backend, and a React + Vite +
Tailwind CSS + React Router single-page frontend. The two are fully
independent — separate codebases, separate deploys, talking only over
HTTPS/JSON.

```
muddo_rewrite/
├── backend/     Django + DRF API (standalone, deployable on its own)
└── frontend/    React + Vite SPA (standalone, deployable on its own)
```

---

## 1. Architecture at a glance

| Layer | Stack | Role |
|---|---|---|
| **Backend** | Django 4.2 + DRF + SimpleJWT + Postgres (Supabase) | Pure JSON API. No HTML rendering except Django's own `/django-admin/` (kept as a break-glass tool). |
| **Frontend** | React 18 + Vite + Tailwind CSS + React Router 6 | Public site, agent portal (`/portal`), admin panel (`/admin`) — all one SPA, route-guarded by role. |
| **Auth** | JWT (access + refresh, `djangorestframework-simplejwt`) | Server determines role (`admin` / `agent` / public) from the authenticated user — never trusts a client-asserted role. |
| **Media** | Local disk (dev) or S3-compatible bucket (prod, optional) | Product photos uploaded through the admin panel. Seed-data images live in the frontend's own `public/images/` folder, not Django. |
| **Chat** | Polling (3s interval), not WebSockets | Deliberate choice — matches the original site's behavior, avoids the added infra (Redis, ASGI server) a real-time upgrade would need for the traffic this site sees. |

**Why separate origins for images matters:** seed-data product photos are
served from the **frontend's** `public/images/` folder (its own origin),
while photos uploaded through the admin panel are served from the
**backend's** `MEDIA_URL` (its own origin, or S3 if configured). The
product serializer (`backend/apps/products/serializers.py`) only
absolutizes the second kind — seed-data paths are left exactly as
`/images/...` so the browser resolves them against the frontend, not the
API. This is a common decoupled-architecture gotcha; it's already
handled correctly.

---

## 2. Local development

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# edit .env — at minimum: DJANGO_SECRET_KEY, DATABASE_URL (or leave blank to use local sqlite)
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```
Runs at `http://127.0.0.1:8000`. Verify with:
```bash
curl http://127.0.0.1:8000/api/v1/products/
```
Default seeded accounts:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `muddo@admin2024` |
| Agent | `alice` / `robert` / `grace` / `patrick` | `agent@2024` |

**Change these before any real deploy** — see Settings → Change Password
in the admin panel once logged in.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_BASE_URL should point at the backend above (http://127.0.0.1:8000/api/v1 for local dev)
npm run dev
```
Runs at `http://localhost:5173`.

---

## 3. Deployment

### 3.1 Backend → Render (or any Python host)

The `backend/` folder is a **complete, standalone Django project** —
`manage.py`, all models, all migrations, admin configs, and management
commands are present. Deploy it as-is; no merging into another repo
needed.

**Dashboard-configured Render service:**
- **Root Directory:** `backend`
- **Build Command:**
  ```
  pip install -r requirements.txt && python manage.py check --fail-level ERROR && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py seed_data
  ```
- **Start Command:**
  ```
  gunicorn muddo_project.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
  ```

**Or use the included Blueprint** (`backend/render.yaml`) if you'd rather
manage the service definition from the repo.

**Required environment variables** (see `backend/.env.example` for the full list):

| Variable | Notes |
|---|---|
| `DJANGO_SECRET_KEY` | Generate a real one — Render's "Generate Value" button works, or `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | `False` in production |
| `ALLOWED_HOSTS` | Your Render service hostname, e.g. `muddo-agro-api.onrender.com` |
| `DATABASE_URL` | Your Supabase Postgres connection string (see 3.3 below) |
| `CORS_ALLOWED_ORIGINS` | Your deployed frontend origin(s), comma-separated |
| `CSRF_TRUSTED_ORIGINS` | Same, if you also touch Django's own admin over HTTPS |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Gmail SMTP + App Password, for contact-form email notifications |
| `WHATSAPP_NUMBER` | Digits only, e.g. `256772507582` |

Everything under "Optional: S3-compatible media storage" in `.env.example`
can be left blank — uploaded product photos and chat attachments fall
back to local disk, which works fine except that Render's free tier disk
is **ephemeral** (wiped on redeploy). Fill in the AWS/S3 vars (Supabase
Storage's S3-compatible endpoint works too, via `AWS_S3_ENDPOINT_URL`) if
you want uploads to persist across deploys.

### 3.2 Frontend → Cloudflare Pages / Netlify / Vercel

```bash
cd frontend
npm install
npm run build      # outputs to dist/
```
Deploy `dist/` as a static site. Set the build command to `npm run build`
and the output directory to `dist` on whichever platform you use — all
three (Cloudflare Pages, Netlify, Vercel) support this directly from the
repo with zero extra config beyond that.

**Required environment variable:**

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | Your deployed backend's API root, e.g. `https://muddo-agro-api.onrender.com/api/v1` |

**SPA routing:** since this is a client-side-routed single-page app, the
host needs to serve `index.html` for any unmatched path (so
`/products/pesticides` loads correctly on a hard refresh, not a 404).
Netlify/Vercel/Cloudflare Pages all auto-detect this for Vite projects;
if not, add a redirect rule sending `/*` → `/index.html` with a 200 status.

### 3.3 Database → Supabase Postgres

1. Create a Supabase project.
2. Project Settings → Database → Connection string → **URI**. Use the
   direct connection (port `5432`) for a long-lived backend host like
   Render; use the Session Pooler (port `6543`) for serverless/edge
   deploys.
3. Paste that string as `DATABASE_URL` in the backend's environment.
   Supabase's connection string already includes `sslmode=require`, so
   no extra SSL configuration is needed.
4. Run `python manage.py migrate` once against it (the Render build
   command already does this on every deploy — safe, migrations are
   idempotent).

### 3.4 Post-deploy checklist
- [ ] Changed the default admin password (Settings → Change Admin Password)
- [ ] Changed all four demo agent passwords, or deleted the demo accounts and created real ones
- [ ] `DEBUG=False` confirmed on the backend
- [ ] Real `DJANGO_SECRET_KEY` set (not the dev fallback)
- [ ] `CORS_ALLOWED_ORIGINS` on the backend matches the frontend's real deployed URL exactly (including `https://`)
- [ ] `VITE_API_BASE_URL` on the frontend points at the real deployed backend URL
- [ ] Real product images dropped into `frontend/public/images/` (see §4)
- [ ] Contact form tested end-to-end (submits, arrives by email, reference number resolves on the Track page)
- [ ] PDF spec sheet download tested on a real product

---

## 4. Images

Real photography is already wired in under `frontend/public/` and
`frontend/public/images/` — nothing here is a placeholder.

- `public/logo_icon.png` — the real circular MACL mark, used everywhere small (navbar, sidebars, login screen, footer).
- `public/logo_full.png` — the full letterhead/business card, shown in its own section on the homepage, right before the footer.
- `public/images/hero_*.jpg` — category hero photography (pesticides, herbicides, fungicides).
- `public/images/product_*.jpg` — real product photos, one per catalogue item, referenced by `seed_data.py`.
- `public/images/banner_admin.png` / `banner_agent.png` — the branded banners at the top of the admin and agent dashboards.
- `public/images/why_quality.jpg` / `why_equipment.jpg` — the homepage "Field-Tested" photo pair.
- `public/images/about_side.jpg`, `handshake.jpg`, `hero_about_banner.png`, `hero_contact_banner.png` — About/Contact page imagery.

**One known gap:** there's no dedicated "Others & Equipment" category
hero photo — `sprayer_field_application.png` stands in for it
(`hero_fertilizers.jpg`), since it's the closest thematic fit. Swap it
for a dedicated shot whenever you have one; it's a one-file replacement,
no code change needed.

**To add or change a product photo:** either upload it through the admin
panel's Product edit screen (stored via the backend, works immediately),
or drop a file into `frontend/public/images/` and point that product's
`image_url` at `/images/yourfile.jpg` in `seed_data.py` (re-run
`python manage.py seed_data` — it only fills in missing products, it
never overwrites existing ones, so editing an existing product's image
is done through the admin panel, not by re-seeding).

---

## 5. Content that's static vs. dynamic — and why

Two kinds of content are deliberately **not** backend-driven:

- **FAQs** (`frontend/src/data/faqs.js`) — grouped into five sections
  (General & Location, Product Verification & Quality, Products & Farm
  Consultation, Orders/Wholesale & Delivery, Support/Returns & Issues).
- **Company contact details** (`frontend/src/data/siteConfig.js`) —
  phone, email, address, business hours, WhatsApp number, Facebook URL.

These used to be fetched from the backend and editable through an admin
"Site Content" page. That's been removed on request — this content
changes rarely, so baking it into the frontend build removes a network
round-trip from every single page load and removes a dependency on the
API being reachable just to render the footer. **To change either, edit
the file directly and redeploy the frontend** — it's not a database
change and won't show up by re-running `seed_data`.

Everything else (products, distributors, agents, supply requests,
messages, contact-form submissions, inventory) is fully dynamic,
database-backed, and admin-editable through the panel as normal.

---

## 6. Product catalogue notes

- **12 real products** across pesticides, herbicides, fungicides, and
  "Others & Equipment" (a knapsack sprayer). NPK 17:17:17 and Foliar
  Boost 20-20-20+TE were removed — confirmed not to be real Muddo
  products.
- **Featured / "Coming Soon" products** — a product can be marked
  `is_featured` (checkbox in the admin Product edit form). While
  featured, it shows a green "Featured — Coming Soon" sticker instead of
  a stock badge, is excluded from the random "Popular Products" homepage
  pick, and appears in its own "Coming Soon" section on the homepage as
  well as normally within its category page. **M-D FOS 70SC** and **MD
  BENZO-MECTIN 5WDG** currently ship as featured/pre-stock. When real
  stock arrives, an admin unchecks "Featured" on that product's edit
  form and sets its stock quantity via Inventory — it then behaves like
  any other in-stock product automatically.
- **Description vs. Usage Instructions** — each product has two separate
  text fields: `description` (a short paragraph, shown truncated on the
  product card) and `usage_instructions` (one practical step per line,
  written for knapsack-sprayer application — the way most Ugandan
  smallholders actually mix and spray — shown as a numbered "How To Use"
  list on the product detail page only). Edit both from the admin
  product form.

---

## 7. Troubleshooting

**"Can't open file '.../backend/manage.py'" on Render** — fixed. If you
see this again, it means Root Directory in the Render dashboard doesn't
point at the folder containing `manage.py`; it should be exactly `backend`.

**Frontend shows a broken/collapsed layout (odd spacing, missing card
borders)** — this was a real bug in an earlier round: several Tailwind
utility classes used fractional values (`w-11.5`, `gap-4.5`, etc.) that
aren't in Tailwind's default scale, which silently produced no CSS at
all. Fixed by extending the scale in `frontend/tailwind.config.js`
(`halfStepSpacing()`). If a similarly-broken class shows up again, check
it against Tailwind's actual default scale before assuming the design is
wrong — it's often just an unsupported class name.

**CORS errors in the browser console** — `CORS_ALLOWED_ORIGINS` on the
backend must exactly match the frontend's deployed origin, including the
scheme (`https://`) and no trailing slash.

**Images 404 in production but work locally** — check whether the path
is `/images/...` (frontend-served, seed data) or `/media/...`
(backend-served, uploaded via admin). A `/media/...` path 404ing usually
means S3 env vars aren't set and Render's ephemeral disk was wiped on
the last redeploy — see §3.1.

**Slow initial load** — the frontend is route-code-split
(`React.lazy` per page in `App.jsx`) and vendor-chunked (Leaflet and
Chart.js only load on the pages that use them, in `vite.config.js`). If
it feels slow again, check the Network tab for what's actually loading
before assuming it's a bundle-size regression — it may just be a slow
API response instead.

---

## 8. What's inside each package (for a from-scratch read)

**`backend/`** — every app (`core`, `products`, `inventory`, `agents`,
`requests_app`, `messaging`, `distributors`, `analytics`) has its own
`models.py`, `migrations/`, `admin.py`, `apps.py`, plus the new DRF layer
(`serializers.py`, `api_views.py`, `urls_api.py`). Shared pieces:
`apps/core/permissions.py` (role-based access, the actual security
boundary — not the frontend route guards, which are UX-only),
`apps/core/exceptions.py` (consistent error responses, never leaks
internals), `apps/core/auth_views.py` (JWT login/refresh/me).

**`frontend/`** — `src/pages/public/`, `src/pages/portal/`,
`src/pages/admin/` for the three route trees; `src/layouts/` for their
shared chrome; `src/api/` for the axios client (with automatic JWT
refresh) and per-resource service functions; `src/components/` for
shared UI (`ProductCard`, `Icon`, `ChatWindow`, `Reveal`, `CountUp`);
`src/data/` for the static FAQ/site-config content described in §5.
