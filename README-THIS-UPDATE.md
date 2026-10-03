# Muddo update — images, secure chat attachments, reviews, leadership

Drop-in changes for the React + Django project. **Nothing existing is replaced**: new images have new
filenames, and edits to existing files are applied by two small, idempotent patch scripts.

## Install (from the repo root)
```bash
unzip -o muddo_update.zip                      # adds new files; does not touch your existing images
python scripts/apply_backend_patches.py        # settings, urls, throttles, seed_data (Ametryn)
python scripts/apply_frontend_patches.py       # routes, nav links, gallery/reviews/leadership hooks, animations
cd backend && python manage.py migrate         # messaging 0004, products 0003+0004, leadership 0001
cd ../frontend && npm run build
```
Both scripts stop and print the exact manual edit if a file has drifted from what they expect.

## What changed
**Images** — 7 new files in `frontend/public/images/` (`field_*.jpg`, `product_ametryn.jpg`), shown through a new
`FieldGallery` (lightbox, lazy-loaded, alt text) at the bottom of each category page and on relevant product pages
(Ametryn, MD MAX 2,4-D, MD FOS, TOP-LAXLY, Acelemectin, Thion, sprayers). No existing image was touched.
Weedit is left out, as you instructed.

**M-D AMETRYN** — added as a herbicide (migration for existing databases, `seed_data` entry for fresh ones).
Stock starts at 0: set the real quantity in Admin → Inventory.
Dosage is "follow the label". Crops/pack size come from the clean label image you supplied —
please check them against the physical bottle (your own profile doc says to verify before publishing).

**Chat attachments (per your PDF spec)**
- Multi-file messages (10 × 25 MB), paperclip + photo buttons, paste, drag-and-drop with a drop zone, upload preview
  chips with type/size/remove, real upload progress, Retry/Remove on failure.
- Originals are never converted: original filename, extension, MIME, size, uploader, timestamp stored in the DB;
  the file is stored under an unguessable name and served back byte-for-byte.
- Security: files live outside `/media/`; downloads need a signed, one-hour, file-bound link that is only minted for
  people allowed to see the message; magic-byte validation (a renamed .exe/.html/.svg is rejected); allow-list of types;
  `nosniff`; agents can only reach their own conversations + broadcasts, admins see all; unknown files return 404.
- Viewer: images (zoom, next/previous, keyboard), PDF, video, audio, CSV/TXT preview, "Preview unavailable + Download" for the rest.
- Three-pane layout (list | chat | info), tablet drawer, mobile single-pane; Shared Files gallery (grid/list, search,
  category tabs, sort, type filter) per conversation and across all conversations; ✓ sent / ✓✓ delivered / ✓✓ read ticks;
  date separators; unread badges; conversation + message search; reply; clear view; report issue.
- Fixed: first load used to show the *oldest* 100 messages; now the newest 100.

**Reviews** — public form (rating, name, comment) on every product page; always starts *pending*; honeypot,
IP-hash duplicate guard, throttle; admin moderation queue at Admin → Reviews; only approved reviews/ratings are public.

**Company Leadership** — About page section + Admin → Leadership (photo, title, bio, order, visible). Hidden until you add someone,
so no placeholder names are invented.

**Bug fixed while here** — login / newsletter throttles never applied (scope was set inside the function body).
They use real throttle classes now (`apps/core/throttles.py`).

## Verified
Backend: ~40 end-to-end checks in a scratch Django project (multi-file send, byte-identical download, token tampering,
cross-user access = 404, disguised files rejected, read/delivered ticks, review moderation, leadership visibility);
migrations match models (`makemigrations --check` clean). Frontend: every new/changed file transpiles.
**Not run:** a full `npm run build` / browser pass against your complete repo (your image folders aren't in what I received) — please do that once.

## Known limits / your decisions
- **Persistence:** Render's free disk is wiped on redeploy. Set the AWS_*/Supabase S3 variables or chat files and uploaded photos vanish.
- Throttle counters are per gunicorn worker (2 workers ⇒ limits are ~2× looser). Add a shared cache (Redis) if you need exact limits.
- Not built: "John is typing…" (needs a new endpoint; polling makes it laggy), malware scanning (no scanner available on Render; validation is in place),
  notification sound, and the separate Conversation/Participant tables from the spec (the existing sender/receiver model was kept so no chat history is migrated).
