# Muddo Agro backend — standalone Django + DRF project

This `backend/` folder is now a **complete, self-contained Django project**
— not a diff to merge into another repo. It includes every model,
migration, admin config, and management command from the original
project, plus the new DRF API layer (serializers, views, JWT auth,
permissions). You can deploy this folder as-is.

## Why this changed
The first version of this package only shipped the *new* files (the API
layer), on the assumption it would be merged by hand into your existing
repo. Once deployed as its own Render service with **Root Directory set
to `backend`**, Render looked for `manage.py` directly inside `backend/`
and it wasn't there — that's what caused the `can't open file
'.../backend/manage.py'` build failure. This version fixes that by
making `backend/` fully standalone.

## Running locally
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # fill in DATABASE_URL (Supabase) + a real DJANGO_SECRET_KEY
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```
Verified in this session: `manage.py check` passes clean, all 34
migrations apply cleanly against a fresh database, `seed_data` seeds 14
products / 11 distributors / 4 agents, and the running server correctly
serves `/api/v1/products/`, `/api/v1/faq/`, and `/api/v1/auth/login/`.

## Deploying to Render
Two ways, pick whichever matches how your existing service is set up:

**A. Dashboard-configured service (what you already have):**
Keep **Root Directory = `backend`** exactly as it is now. That setting
is what was failing — it was correct, `manage.py` just wasn't there
yet. It is now. No other dashboard changes needed. Build/start commands:
```
Build:  pip install -r requirements.txt && python manage.py check --fail-level ERROR && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py seed_data
Start:  gunicorn muddo_project.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

**B. Render Blueprint (`render.yaml`):** included at `backend/render.yaml`
with `rootDir: backend` baked in — use this if you want Render to manage
the service definition from the repo instead of the dashboard.

## Required environment variables
See `.env.example`. At minimum for a working deploy:
- `DJANGO_SECRET_KEY` — generate a real one, never reuse the dev fallback
- `DEBUG=False`
- `ALLOWED_HOSTS` — your Render service hostname
- `DATABASE_URL` — your Supabase Postgres connection string
- `CORS_ALLOWED_ORIGINS` — your deployed frontend's origin(s)

## What's inside now (nothing hidden)
- Every app's `models.py`, `migrations/*.py`, `admin.py`, `apps.py` — reconstructed to match your original project exactly (field-for-field, migration-for-migration).
- `seed_data.py` — **one intentional change**: image paths now read `/images/...` instead of `/static/images/...`, because those paths need to resolve against the React frontend's own origin now, not Django's. See root `README.md` for the full explanation.
- `dedupe_products.py`, `verify_distributor_locations.py` — unchanged utility commands.
- The new DRF layer: `serializers.py`, `api_views.py`, `urls_api.py` per app, JWT auth (`auth_views.py`), shared permission classes (`permissions.py`), consistent error handling (`exceptions.py`).
- `manage.py`, `muddo_project/wsgi.py`, `muddo_project/asgi.py` — standard Django scaffolding, now present.
- `render.yaml`, `Procfile` — deploy configs for this standalone structure.

## What's intentionally NOT here
- Old template-rendering `views.py` files and the `templates/` directory — these belonged to the server-rendered version and have no role in an API-only backend.
- `apps/core/templatetags/` (icons.py, muddo_filters.py) — those powered Django template rendering only; the equivalent icon system now lives in the React app (`frontend/src/components/Icon.jsx`).
