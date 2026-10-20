"""Separates the P.O. Box from the HQ's physical address and uses the Venus Plaza wording."""
from django.db import migrations

NEW = 'Basement Room V013, Venus Plaza, Container Village, Nakivubo Place, Kampala Central Division'


def fix(apps, schema_editor):
    D = apps.get_model('distributors', 'Distributor')
    for d in D.objects.filter(name__startswith='Muddo Agro HQ'):
        if 'P.O' in (d.address or '') or 'Equity' in (d.address or ''):
            d.address = NEW
            d.save(update_fields=['address'])


class Migration(migrations.Migration):
    dependencies = [('distributors', '0003_distributor_location_details')]
    operations = [migrations.RunPython(fix, migrations.RunPython.noop)]
