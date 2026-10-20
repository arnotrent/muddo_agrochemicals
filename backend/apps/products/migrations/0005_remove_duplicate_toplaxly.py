"""
TOP-LAXLY M 72WP was listed twice: once as 'TOP-LAXLY M 72WP' and again as 'MD TOP LAXLYN 72WP'
(the same Metalaxyl + Mancozeb product). Keeps the genuine 'TOP-LAXLY M 72WP' and removes the
duplicate(s). If the genuine row itself exists more than once, the best copy is kept
(has a photo > has a description > oldest) and the largest stock figure is retained — stock is
NOT summed, because a duplicated seed row would otherwise double-count the same bottles.
Safe to run on a database that has no duplicate (does nothing).
"""
import re
from django.db import migrations


def norm(name):
    return re.sub(r'[^a-z0-9]', '', (name or '').lower())


def dedupe(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Inventory = apps.get_model('inventory', 'Inventory')
    rows = list(Product.objects.all().order_by('id'))

    for p in rows:  # the "MD TOP LAXLYN" listing is the duplicate
        if norm(p.name).startswith('mdtoplaxlyn'):
            p.delete()

    genuine = [p for p in Product.objects.all().order_by('id') if norm(p.name).startswith('toplaxlym')]
    if len(genuine) > 1:
        def score(p):
            return (1 if (p.image_file or p.image_url) else 0, 1 if p.description else 0, -p.id)
        genuine.sort(key=score, reverse=True)
        keeper, extras = genuine[0], genuine[1:]
        best = 0
        for p in genuine:
            inv = Inventory.objects.filter(product=p).first()
            best = max(best, inv.stock_qty if inv else 0)
        inv, _ = Inventory.objects.get_or_create(product=keeper, defaults={'stock_qty': 0})
        inv.stock_qty = best
        inv.save()
        for e in extras:
            e.delete()


class Migration(migrations.Migration):
    dependencies = [('products', '0004_seed_ametryn'), ('inventory', '0001_initial')]
    operations = [migrations.RunPython(dedupe, migrations.RunPython.noop)]
