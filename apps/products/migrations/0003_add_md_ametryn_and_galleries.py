from django.db import migrations
from apps.products.catalog_additions import apply_additions


def forwards(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    ProductImage = apps.get_model('products', 'ProductImage')
    Inventory = apps.get_model('inventory', 'Inventory')
    # Existing database -> add the missing product. Brand-new database -> `seed_data` adds it
    # (adding it here would make seed_data think the catalogue is already seeded and skip the rest).
    apply_additions(Product, ProductImage, Inventory, add_missing_products=Product.objects.exists())


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0002_productimage_productreview'),
        ('inventory', '0001_initial'),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
