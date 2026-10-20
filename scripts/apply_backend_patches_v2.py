#!/usr/bin/env python3
"""Round-2 backend edits to EXISTING files. Run from repo root. Idempotent and strict."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0

def edit(rel, steps):
    """steps: list of (old, new, marker). Skips a step when marker already present."""
    global bad
    p = ROOT / rel
    if not p.exists():
        print(f'!! {rel} not found'); bad += 1; return
    t = p.read_text(); changed = False
    for old, new, marker in steps:
        if marker in t:
            print(f'-- {rel}: already applied ({marker[:36]})'); continue
        if t.count(old) < 1:
            print(f'!! {rel}: anchor not found — edit by hand:\n   {old!r}'); bad += 1; continue
        t = t.replace(old, new, 1); changed = True
    if changed:
        p.write_text(t); print(f'OK {rel}')

# ── settings: make sure every app is installed + notification mailboxes ─────────────
S = 'backend/muddo_project/settings.py'
p = ROOT / S
if p.exists():
    t = p.read_text(); ch = False
    for app in ('apps.leadership', 'apps.testimonials'):
        if f"'{app}'" not in t:
            anchor = "    'apps.analytics',\n"
            if anchor not in t:
                print(f'!! {S}: add {app!r} to INSTALLED_APPS by hand'); bad += 1; continue
            t = t.replace(anchor, anchor + f"    '{app}',\n", 1); ch = True
    if 'COMPANY_NOTIFY_EMAILS' not in t:
        block = ("\n# Company mailboxes that receive new-enquiry notifications (comma-separated env var overrides).\n"
                 "COMPANY_NOTIFY_EMAILS = config('COMPANY_NOTIFY_EMAILS', default='muddoagro811@gmail.com,kulangu_w@yahoo.com', cast=Csv())\n")
        anchor = "WHATSAPP_NUMBER = config("
        if anchor in t:
            t = t.replace(anchor, block.lstrip('\n') + anchor, 1); ch = True
        else:
            print(f'!! {S}: add COMPANY_NOTIFY_EMAILS by hand'); bad += 1
    if ch: p.write_text(t); print(f'OK {S}')
    else: print(f'-- {S}: already applied')
else:
    print(f'!! {S} not found'); bad += 1

edit('backend/muddo_project/urls.py', [(
    "    path('api/v1/', include('apps.analytics.urls_api')),\n",
    "    path('api/v1/', include('apps.analytics.urls_api')),\n    path('api/v1/', include('apps.testimonials.urls_api')),\n",
    'apps.testimonials.urls_api')])

edit('backend/apps/core/api_views.py', [
    ("def _send(subj, to, body):", "from apps.core.notify import company_recipients, company_contact_line\n\n\ndef _send(subj, to, body):", 'company_recipients, company_contact_line'),
    ("{cr.subject}', [site.company_email],", "{cr.subject}', company_recipients(site),", 'company_recipients(site)'),
    ('f"Muddo Agro Team\\n{site.company_phone}")', 'f"Muddo Agro Team\\n{company_contact_line()}")', 'company_contact_line()}'),
])

edit('backend/apps/products/api_views.py', [(
    "'MUDDO AGRO CHEMICALS LTD \\u00b7 Container Village Nakivubo, Kampala \\u00b7 +256 772 507582 \\u00b7 muddoagro811@gmail.com'",
    "'MUDDO AGRO CHEMICALS LTD \\u00b7 Basement Room V013, Venus Plaza, Container Village, Nakivubo Place, Kampala \\u00b7 P.O. Box 25240 \\u00b7 +256 772 507582 / +256 702 507582 \\u00b7 muddoagro811@gmail.com / kulangu_w@yahoo.com'",
    'Venus Plaza, Container Village')])

edit('backend/apps/analytics/api_views.py', [
    ("        'low_stock': Inventory.objects.filter(stock_qty__lte=F('reorder_level')).count(),",
     "        'low_stock': Inventory.objects.filter(stock_qty__lte=F('reorder_level')).exclude(product__is_featured=True).count(),",
     ".exclude(product__is_featured=True).count()"),
    ("            Inventory.objects.filter(stock_qty__lte=F('reorder_level')).select_related('product').order_by('stock_qty')[:5],",
     "            Inventory.objects.filter(stock_qty__lte=F('reorder_level')).exclude(product__is_featured=True).select_related('product').order_by('stock_qty')[:5],",
     ".exclude(product__is_featured=True).select_related"),
])

edit('backend/apps/core/management/commands/seed_data.py', [
    ("\nDISTRIBUTORS=[", "\n# TOP-LAXLY M 72WP was listed twice; 'MD TOP LAXLYN 72WP' is the duplicate and is never seeded.\nPRODUCTS = [p for p in PRODUCTS if 'LAXLYN' not in p['name'].upper()]\n\nDISTRIBUTORS=[", "'LAXLYN' not in p['name']"),
    ("Container Village Nakivubo, Equity Bank Basement V013, P.O Box 25240",
     "Basement Room V013, Venus Plaza, Container Village, Nakivubo Place, Kampala Central Division", 'Venus Plaza, Container Village'),
])
sys.exit(1 if bad else 0)
