#!/usr/bin/env python3
"""
Update 6 — small, anchored edits to EXISTING files (and the migrations that go with them).
Run from the repo root AFTER copying this package's files over the repo:   python scripts/apply_update6.py
Idempotent (safe to run twice) and strict: if an anchor has drifted it says exactly which edit to make by hand.
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
bad = 0


def _read(rel):
    p = ROOT / rel
    if not p.exists():
        return None, p
    return p.read_text(encoding='utf-8'), p


def edit(rel, steps):
    """steps: (old, new, marker). Literal anchor must occur exactly once; skipped when marker already present."""
    global bad
    t, p = _read(rel)
    if t is None:
        print(f'!! {rel} not found'); bad += 1; return
    ch = False
    for old, new, marker in steps:
        if marker in t:
            print(f'-- {rel}: already applied ({marker[:40]})'); continue
        if t.count(old) != 1:
            print(f'!! {rel}: anchor not found exactly once — edit by hand:\n   {old[:160]!r}'); bad += 1; continue
        t = t.replace(old, new); ch = True
    if ch:
        p.write_text(t, encoding='utf-8'); print(f'OK {rel}')


def rx(rel, pattern, repl, marker):
    """Regex edit (DOTALL). `repl` is a string or a function(match)."""
    global bad
    t, p = _read(rel)
    if t is None:
        print(f'!! {rel} not found'); bad += 1; return
    if marker in t:
        print(f'-- {rel}: already applied ({marker[:40]})'); return
    fn = repl if callable(repl) else (lambda m: repl)
    new, n = re.subn(pattern, fn, t, count=1, flags=re.S)
    if n != 1:
        print(f'!! {rel}: pattern not found — see README-UPDATE-6.md for the manual edit ({marker})'); bad += 1; return
    p.write_text(new, encoding='utf-8'); print(f'OK {rel}')


def flex(rel, pieces, new, marker):
    """Whitespace-tolerant multi-line anchor."""
    rx(rel, r'\s*'.join(re.escape(x) for x in pieces), new, marker)


def migration(app, slug, body):
    """Creates the next migration in apps/<app>/migrations, depending on the current latest one."""
    global bad
    d = ROOT / 'backend' / 'apps' / app / 'migrations'
    if not d.exists():
        print(f'!! {d} not found'); bad += 1; return
    if list(d.glob(f'*_{slug}.py')):
        print(f'-- {app}: migration {slug} already exists'); return
    names = sorted(p.stem for p in d.glob('[0-9][0-9][0-9][0-9]_*.py'))
    prev = names[-1]
    num = int(prev[:4]) + 1
    (d / f'{num:04d}_{slug}.py').write_text(body.replace('__PREV__', prev), encoding='utf-8')
    print(f'OK {app}: created migration {num:04d}_{slug} (after {prev})')


# ═════════════ BACKEND ═════════════════════════════════════════════════════
STATUS_OLD = "    STATUS = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]"
STATUS_NEW = "    STATUS = [('pending', 'Pending'), ('approved', 'Approved'), ('hidden', 'Hidden'), ('rejected', 'Rejected')]"
edit('backend/apps/products/models.py', [(STATUS_OLD, STATUS_NEW, "('hidden', 'Hidden')")])
edit('backend/apps/testimonials/models.py', [(STATUS_OLD, STATUS_NEW, "('hidden', 'Hidden')")])

ALTER = '''from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('{app}', '__PREV__')]
    operations = [
        migrations.AlterField(
            model_name='{model}', name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('hidden', 'Hidden'),
                                            ('rejected', 'Rejected')], db_index=True, default='pending', max_length=10)),
    ]
'''
migration('products', 'update6_review_hidden_status', ALTER.replace('{app}', 'products').replace('{model}', 'productreview'))
migration('testimonials', 'update6_testimonial_hidden_status', ALTER.replace('{app}', 'testimonials').replace('{model}', 'testimonial'))

# chat attachments now live in the database (survive redeploys) → needs the StoredFile model
STORED = '''

class StoredFile(models.Model):
    """Bytes of a chat attachment, kept in the database so redeploys can never wipe them (see storage.DatabaseStorage)."""
    name = models.CharField(max_length=255, unique=True)
    data = models.BinaryField()
    size = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
'''
t, p = _read('backend/apps/messaging/models.py')
if t is None:
    print('!! backend/apps/messaging/models.py not found'); bad += 1
elif 'class StoredFile' in t:
    print('-- messaging/models.py: StoredFile already present')
else:
    p.write_text(t.rstrip('\n') + '\n' + STORED, encoding='utf-8'); print('OK backend/apps/messaging/models.py')
migration('messaging', 'update6_storedfile', '''from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('messaging', '__PREV__')]
    operations = [
        migrations.CreateModel(
            name='StoredFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, unique=True)),
                ('data', models.BinaryField()),
                ('size', models.BigIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
''')

# featured ("coming soon") products never raise out-of-stock / low-stock alerts
edit('backend/apps/analytics/api_views.py', [
    ("        'low_stock': Inventory.objects.filter(stock_qty__lte=F('reorder_level')).count(),",
     "        'low_stock': Inventory.objects.filter(stock_qty__lte=F('reorder_level')).exclude(product__is_featured=True).count(),",
     ".exclude(product__is_featured=True).count()"),
    ("            Inventory.objects.filter(stock_qty__lte=F('reorder_level')).select_related('product').order_by('stock_qty')[:5],",
     "            Inventory.objects.filter(stock_qty__lte=F('reorder_level')).exclude(product__is_featured=True).select_related('product').order_by('stock_qty')[:5],",
     ".exclude(product__is_featured=True).select_related"),
])

# build-breaking route (`'reviews/recent/'.as_view()`) — fixed only if it is still present
t, p = _read('backend/apps/products/urls_api.py')
if t and "'reviews/recent/'.as_view()" in t:
    t = t.replace("path('reviews/recent/'.as_view(), name='api_recent_reviews')",
                  "path('reviews/recent/', RecentProductReviewsView.as_view(), name='api_recent_reviews')")
    t = t.replace("from apps.products.review_views import ProductReviewsView, AdminReviewListView, AdminReviewDetailView",
                  "from apps.products.review_views import (\n    ProductReviewsView, AdminReviewListView, AdminReviewDetailView, RecentProductReviewsView,\n)")
    p.write_text(t, encoding='utf-8'); print('OK backend/apps/products/urls_api.py (fixed broken reviews/recent route)')
    rv, rp = _read('backend/apps/products/review_views.py')
    if rv and 'class RecentProductReviewsView' not in rv:
        rp.write_text(rv.rstrip('\n') + '''


class RecentProductReviewsView(APIView):
    """GET /api/v1/reviews/recent/ -> latest APPROVED reviews across all products (hidden / rejected never appear)."""
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.products.review_serializers import ReviewRecentSerializer
        approved = ProductReview.objects.filter(status='approved').select_related('product')
        return Response({'summary': _summary(approved), 'results': ReviewRecentSerializer(approved[:60], many=True).data})
''', encoding='utf-8'); print('OK backend/apps/products/review_views.py (added RecentProductReviewsView)')
else:
    print('-- products/urls_api.py: reviews/recent route already fine')

# ═════════════ FRONTEND ════════════════════════════════════════════════════
# 1. light-green highlight words
edit('frontend/src/pages/public/HomePage.jsx', [(
    '<span className="text-accent-blue">Agrochemical</span>',
    '<span className="text-accent-green">Agrochemical</span>', 'text-accent-green">Agrochemical')])
edit('frontend/src/pages/public/AboutPage.jsx', [
    ('<span className="text-accent-blue">supplied honestly.</span>',
     '<span className="text-green-600 dark:text-accent-green">supplied honestly.</span>', 'dark:text-accent-green">supplied honestly'),
    ("import LeadershipSection from '../../components/LeadershipSection'\n",
     "import LeadershipSection from '../../components/LeadershipSection'\nimport Reveal from '../../components/Reveal'\n", "import Reveal"),
    ('rounded-full bg-bg-alt text-text-2 text-xs font-bold hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"',
     'rounded-full bg-bg-alt text-text-2 text-xs font-bold hover:text-accent-blue hover:bg-accent-blue/10 hover:-translate-y-0.5 hover:shadow-md active:scale-95 transition-all duration-300"',
     'active:scale-95 transition-all duration-300'),
])
# 2. animated FAQ category titles (the questions themselves are untouched)
flex('frontend/src/pages/public/AboutPage.jsx', [
    '<div className="flex items-center gap-2.5 mb-3.5">',
    '<div className="w-9 h-9 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name={group.icon} /></div>',
    '<h3 className="text-lg font-bold text-text-1">{group.title}</h3>',
    '</div>'],
    '''<Reveal>
                <div className="group flex items-center gap-3 mb-3.5 cursor-default">
                  <div className="w-9 h-9 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:bg-accent-blue group-hover:text-white"><Icon name={group.icon} /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text-1 transition-colors duration-300 group-hover:text-accent-blue">{group.title}</h3>
                    <span className="block h-0.5 mt-1 w-10 rounded-full bg-accent-blue/60 transition-all duration-500 group-hover:w-full" />
                  </div>
                </div>
              </Reveal>''', 'group-hover:-rotate-6')

# 3. compare page: featured products read "Coming Soon", never "Out of Stock"
edit('frontend/src/pages/public/ComparePage.jsx', [(
    "  ['Stock', (p) => p.stock_status === 'in' ? 'In Stock' : p.stock_status === 'low' ? 'Low Stock' : 'Out of Stock'],",
    "  ['Stock', (p) => p.stock_status === 'featured' ? 'Coming Soon' : p.stock_status === 'in' ? 'In Stock' : p.stock_status === 'low' ? 'Low Stock' : 'Out of Stock'],",
    "'Coming Soon'")])

# 4. tailwind animations used by the reviews / track page
edit('frontend/tailwind.config.js', [
    ("        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },\n",
     "        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },\n"
     "        starPop: { '0%': { opacity: 0, transform: 'scale(0) rotate(-45deg)' }, '60%': { opacity: 1, transform: 'scale(1.25) rotate(8deg)' }, '100%': { opacity: 1, transform: 'scale(1) rotate(0)' } },\n",
     'starPop: {'),
    ("        shimmer: 'shimmer 1.4s infinite linear',\n",
     "        shimmer: 'shimmer 1.4s infinite linear',\n        starPop: 'starPop 450ms cubic-bezier(.22,1,.36,1) both',\n", "starPop: 'starPop"),
])

# 5. photo picker (drag & drop / paste / link) inside the public feedback pop-up
edit('frontend/src/components/FeedbackModal.jsx', [(
    "import Icon from './Icon'\n", "import Icon from './Icon'\nimport ImageDropzone from './ImageDropzone'\n", 'import ImageDropzone')])
rx('frontend/src/components/FeedbackModal.jsx',
   r'(<span className="text-sm font-semibold text-text-2 block mb-1\.5">Your photo.*?</span></span>)\s*<div className="flex items-center gap-3 flex-wrap">.*?<Err k="photo" />',
   lambda m: m.group(1) + '\n                      <ImageDropzone shape="round" file={photo} onFile={(f) => { setPhoto(f); setErrors((e) => ({ ...e, photo: undefined })) }} label="Add a photo" />\n                      <Err k="photo" />',
   '<ImageDropzone shape="round"')

# 6. chat: clearer read ticks, green "my" bubbles (so grey/blue ticks stay visible), skeleton while loading
rx('frontend/src/components/ChatWindow.jsx', r'function Ticks\(\{ status \}\) \{.*?\n\}\n',
   '''function Ticks({ status }) {
  const read = status === 'read'
  const label = read ? 'Read' : status === 'delivered' ? 'Delivered' : 'Sent'
  return (
    <span data-tick={status} title={label} aria-label={label}
      className={`inline-flex transition-colors duration-500 ${read ? 'text-[#2563EB] dark:text-[#38BDF8]' : 'text-slate-400'}`}>
      <ChatIcon name={status === 'sent' ? 'check' : 'checks'} size="1.25em" />
    </span>
  )
}
''', 'data-tick')
edit('frontend/src/components/ChatWindow.jsx', [
    ("'bg-accent-blue/20 border border-accent-blue/30 text-text-1 rounded-br-md'",
     "'bg-accent-green/15 border border-accent-green/30 text-text-1 rounded-br-md'", 'bg-accent-green/15 border border-accent-green/30'),
    ("  onOpenAttachment, clearedBefore, search, setSearch, searchOpen, setSearchOpen,",
     "  onOpenAttachment, clearedBefore, search, setSearch, searchOpen, setSearchOpen, loading,", 'searchOpen, setSearchOpen, loading,'),
    ("import MessageAttachments from './chat/MessageAttachments'\n",
     "import MessageAttachments from './chat/MessageAttachments'\nimport ChatSkeleton from './chat/ChatSkeleton'\n", 'import ChatSkeleton'),
    ('{!visible.length && !pending.length && <div className="m-auto text-center text-text-3 text-sm">',
     '{loading && !visible.length && <ChatSkeleton />}\n        {!loading && !visible.length && !pending.length && <div className="m-auto text-center text-text-3 text-sm">', '<ChatSkeleton />'),
])
edit('frontend/src/components/chat/ChatWorkspace.jsx', [(
    'onOpenAttachment={open} clearedBefore={cleared[key]} search={msgSearch} setSearch={setMsgSearch}',
    'onOpenAttachment={open} clearedBefore={cleared[key]} search={msgSearch} setSearch={setMsgSearch} loading={chat.loading}',
    'loading={chat.loading}')])

# 7. "Keep me signed in" + no more surprise log-outs
rx('frontend/src/api/client.js', r'export const tokenStore = \{.*?\n\}\n',
   '''// "Keep me signed in": tokens live in localStorage (they survive closing the browser). Without it they live in
// sessionStorage (gone when the browser closes). Token rotation keeps whichever store is already in use.
const stores = () => [localStorage, sessionStorage]
const where = () => (sessionStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(ACCESS_KEY) ? sessionStorage : localStorage)
const read = (k) => sessionStorage.getItem(k) || localStorage.getItem(k)

export const tokenStore = {
  getAccess: () => read(ACCESS_KEY),
  getRefresh: () => read(REFRESH_KEY),
  set: (access, refresh, remember) => {
    let store = where()
    if (typeof remember === 'boolean') {
      stores().forEach((s) => { s.removeItem(ACCESS_KEY); s.removeItem(REFRESH_KEY) })
      store = remember ? localStorage : sessionStorage
    }
    store.setItem(ACCESS_KEY, access)
    if (refresh) store.setItem(REFRESH_KEY, refresh)
  },
  clear: () => stores().forEach((s) => { s.removeItem(ACCESS_KEY); s.removeItem(REFRESH_KEY) }),
}
''', 'const where = ')
edit('frontend/src/api/client.js', [(
    "        if (refreshErr.definitive) { tokenStore.clear(); emit('auth:expired') }\n        return Promise.reject(error)",
    "        if (refreshErr.definitive) { tokenStore.clear(); emit('auth:expired') }\n        // a TEMPORARY failure (network blip, server waking) must not look like \"401 → sign out\" to callers\n        return Promise.reject(refreshErr.definitive ? error : refreshErr)",
    'refreshErr.definitive ? error : refreshErr')])
edit('frontend/src/context/AuthContext.jsx', [
    ('  const login = async (username, password) => {', '  const login = async (username, password, remember = true) => {', 'remember = true'),
    ('    tokenStore.set(data.access, data.refresh)', '    tokenStore.set(data.access, data.refresh, !!remember)', '!!remember'),
])
edit('frontend/src/pages/public/LoginPage.jsx', [
    ('  const [loading, setLoading] = useState(false)', '  const [loading, setLoading] = useState(false)\n  const [remember, setRemember] = useState(true)', 'setRemember] = useState'),
    ('await login(username.trim(), password)', 'await login(username.trim(), password, remember)', 'password, remember)'),
    ('<div className="text-right mb-5.5">',
     '<div className="flex items-center justify-between gap-3 flex-wrap mb-5.5">\n          <label className="flex items-center gap-2 text-sm font-semibold text-text-2 cursor-pointer select-none"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4" />Keep me signed in</label>',
     'Keep me signed in'),
])

print('\nAll update-6 edits applied.' if not bad else f'\n{bad} edit(s) need to be made by hand — see the "!!" lines above.')
sys.exit(1 if bad else 0)
