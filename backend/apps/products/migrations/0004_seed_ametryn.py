"""
Adds M-D AMETRYN (a genuine MACL product missing from the catalogue).
Idempotent: skips if any product with 'ametryn' in its name already exists, so it is
safe on databases where it was added by hand. seed_data only seeds an EMPTY catalogue,
which is why this is a migration and not just an entry in seed_data.py.

Only facts printed on the label photo are used. Dosage is deliberately 'follow the label'.
"""
from django.db import migrations


def add_ametryn(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Inventory = apps.get_model('inventory', 'Inventory')
    if not Product.objects.exists():
        return  # fresh database: seed_data creates the full catalogue incl. Ametryn
    if Product.objects.filter(name__icontains='ametryn').exists():
        return
    p = Product.objects.create(
        name='M-D AMETRYN', category='herbicide',
        image_url='/images/product_ametryn.jpg',
        active_ingredient='Ametryn 500 g/L',
        formulation='Suspension Concentrate (SC) — Group 5 triazine herbicide',
        crops='Sugarcane, Pineapple, Cassava, Tomatoes',
        dosage='Follow the rate on the product label',
        packing='1 Litre',
        description=('A selective triazine (Group 5) herbicide for the control of annual broadleaved weeds '
                     'and annual grasses in sugarcane, pineapple, cassava and tomatoes.'),
        usage_instructions=('Read the complete product label before use.\n'
                            'Use only on the crops listed on the label, at the label rate.\n'
                            'Mix in clean water in a calibrated sprayer and apply evenly.\n'
                            'Wear gloves, goggles, face mask and protective clothing while mixing and spraying.'),
    )
    # Stock is unknown — an admin must set the real quantity in Admin → Inventory.
    Inventory.objects.get_or_create(product=p, defaults={'stock_qty': 0, 'reorder_level': 10, 'unit': 'units'})


class Migration(migrations.Migration):
    dependencies = [('products', '0003_productreview'), ('inventory', '0001_initial')]
    operations = [migrations.RunPython(add_ametryn, migrations.RunPython.noop)]
