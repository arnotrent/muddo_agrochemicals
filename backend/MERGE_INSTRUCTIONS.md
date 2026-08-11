# How this package merges into your existing Django project

This package contains **only new/changed files**. Nothing here recreates
your models, migrations, management commands, or seed data — those stay
exactly as they are in your current repo, because they already work and
hold your real product data.

## 1. Files to copy from THIS package into your repo (overwrite):
```
muddo_project/settings.py      <- replaces template-era settings
muddo_project/urls.py          <- replaces template-era urls
requirements.txt               <- adds DRF/JWT/CORS/Postgres deps
.env.example                   <- new
apps/core/management/commands/seed_data.py  <- UPDATED (see note below)
apps/core/permissions.py       <- new
apps/core/exceptions.py        <- new
apps/core/validators.py        <- new
apps/core/auth_views.py        <- new
apps/core/urls_auth.py         <- new
apps/core/serializers.py       <- new
apps/core/api_views.py         <- new
apps/core/urls_api.py          <- new
apps/products/serializers.py   <- new
apps/products/api_views.py     <- new
apps/products/urls_api.py      <- new
apps/inventory/serializers.py  <- new
apps/inventory/api_views.py    <- new
apps/inventory/urls_api.py     <- new
apps/agents/serializers.py     <- new
apps/agents/api_views.py       <- new
apps/agents/urls_api.py        <- new
apps/requests_app/serializers.py <- new
apps/requests_app/api_views.py   <- new
apps/requests_app/urls_api.py    <- new
apps/messaging/serializers.py  <- new
apps/messaging/api_views.py    <- new
apps/messaging/urls_api.py     <- new
apps/distributors/serializers.py <- new
apps/distributors/api_views.py   <- new
apps/distributors/urls_api.py    <- new
apps/analytics/api_views.py    <- new
apps/analytics/urls_api.py     <- new
```

## 2. Files to KEEP UNCHANGED from your existing repo (do not delete):
- Every `models.py` (all 8 apps)
- Every `migrations/*.py` file (all 8 apps) — this is your schema history
  and, once you have real Supabase data, your data history too
- `apps/*/admin.py`, `apps/*/apps.py` — unchanged, Django admin still works
- `apps/core/management/commands/dedupe_products.py`,
  `verify_distributor_locations.py` — unchanged
- **`apps/core/management/commands/seed_data.py` is the ONE exception —
  this package's copy REPLACES yours.** The only change is that every
  product's `img` path now reads `/images/...` instead of
  `/static/images/...`, because that path now has to resolve against the
  React frontend's own origin (which serves files from
  `frontend/public/images/`), not against Django. If you've customized
  this file since the original zip (added products, changed stock
  numbers, etc.), diff it against your version and carry your changes
  over rather than blindly overwriting — the only structural change is
  that one `/static/` → removal.
- `apps/core/context_processors.py`, `apps/core/templatetags/*` — no
  longer wired into `TEMPLATES`, safe to leave in place or delete later;
  not deleted now since you said "don't delete without asking"
- `muddo_project/wsgi.py`, `asgi.py` — unchanged
- `manage.py` — unchanged

## 3. Files that become DEAD CODE (kept for now, not deleted):
- Every `apps/*/views.py` (the old HTML-rendering views) and every
  `templates/*.html` file. They're not imported by the new `urls.py`
  and won't run — but per your Stage 3 instruction, I'm leaving them in
  place rather than deleting, in case you want to reference them while
  building out the React pages. Safe to delete once you've confirmed
  the React frontend covers everything.
- `apps/*/urls.py` (the old template-based url files, e.g.
  `apps/products/urls.py`) — replaced by `urls_api.py`. Also left in
  place, just unreferenced from the project's root `urls.py` now.

## 4. What you need to do locally
```bash
pip install -r requirements.txt
cp .env.example .env
# edit .env: paste your real Supabase DATABASE_URL, generate a real
# DJANGO_SECRET_KEY, set CORS_ALLOWED_ORIGINS to your Vite dev URL
# (http://localhost:5173) and your real frontend domain later.

python manage.py migrate          # applies your EXISTING migrations
                                   # against Supabase — no schema changes
                                   # in this step, just moving DB engine.
python manage.py seed_data        # your real product/distributor/agent
                                   # data — unchanged command
python manage.py runserver
```

Then hit `http://127.0.0.1:8000/api/v1/products/` — you should see your
real seeded product catalogue as JSON, paginated.

## 5. One thing to double check with Supabase specifically
Supabase's Postgres requires SSL. `settings.py` already sets
`ssl_require=not DEBUG`, so in production it's enforced; in local dev
with `DEBUG=True` it isn't required (works against local Postgres too).
If you connect to Supabase *while* `DEBUG=True` locally, either flip
`ssl_require=True` temporarily or add `?sslmode=require` to your
`DATABASE_URL` — Supabase's own connection string already includes this
correctly if you copy it straight from their dashboard.
