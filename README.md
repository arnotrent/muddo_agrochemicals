# Muddo Agro Chemicals LTD \u2014 Django DRF API + React SPA

Two independently deployable projects:

```
backend/    Django + Django REST Framework API (merge into your existing repo \u2014 see backend/MERGE_INSTRUCTIONS.md)
frontend/   React + Vite + Tailwind + React Router SPA (new, standalone)
```

## Status
- Backend: full DRF API layer (serializers, views, urls, JWT auth, permissions) built against your existing models/migrations. Not yet merged into your live repo \u2014 follow `backend/MERGE_INSTRUCTIONS.md`.
- Frontend: builds cleanly (`npm run build` verified). Public site, agent portal, and admin panel are all wired to the real API endpoints above. No mock data anywhere \u2014 every page fetches from `/api/v1/...`.

## Images \u2014 where to drop them in when ready
The frontend expects these paths under `frontend/public/`:
```
public/
  logo_full.png
  images/
    hero_home.jpg
    hero_pesticides.jpg
    hero_herbicides.jpg
    hero_fungicides.jpg
    hero_fertilizers.jpg
    hero_contact_banner.png
    hero_about_banner.png
    macl_banner.jpg
    products_all.jpg        (fallback used by onError handlers)
    product_*.jpg           (only needed if you still reference by
                              filename in image_url \u2014 otherwise product
                              photos come from the database, either
                              image_file (uploaded, served via
                              MEDIA_URL/S3) or image_url)
```
Same filenames as your original `static/images/` folder \u2014 drop them in
and Vite serves them as-is with no code changes needed, exactly like the
original `static/images/` behavior.

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

Log in at `/login` with your existing admin/agent seed credentials \u2014
the login screen now hits `/api/v1/auth/login/` and gets back a JWT pair,
no more Django session cookies.

## Page coverage (React)
**Public:** Home, Product category (pesticides/herbicides/fungicides/other), Product detail, Contact, Distributors (Leaflet map), About + FAQ, Track enquiry, Search, Compare, Login, 404.
**Agent portal:** Dashboard (supply requests), Chat, Profile.
**Admin panel:** Dashboard (Chart.js), Products CRUD, Inventory, Distributors CRUD, Enquiries, Supply Requests, Agents, Chat, Site Content + FAQ, Newsletter, CSV Import, Settings (password change, agent password reset, system info).

Every one of these pages calls the real `/api/v1/...` endpoints \u2014 no mock data anywhere.

## What's next
- Drop in real images (see above) and the site will look complete immediately \u2014 all image paths are already wired.
- Production deploy: backend to Render/Railway (Postgres via Supabase already wired), frontend to Cloudflare Pages/Netlify/Vercel as a static build (`npm run build` \u2192 `dist/`), pointed at the deployed API via `VITE_API_BASE_URL`.
- Optional polish once you've reviewed: code-splitting the frontend bundle (currently one ~700KB chunk \u2014 Vite warns about this but it's not broken, just not optimally lazy-loaded), and deleting the now-dead Django template files per `backend/MERGE_INSTRUCTIONS.md` section 3 once you're confident the React pages cover everything you need.
