"""Foliar Boost is NOT a Muddo Agro product. Removes it (and its stock rows) from any database where it was added."""
from django.db import migrations


def remove(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Product.objects.filter(name__icontains='foliar').delete()


class Migration(migrations.Migration):
    dependencies = [('products', '0005_remove_duplicate_toplaxly')]
    operations = [migrations.RunPython(remove, migrations.RunPython.noop)]
