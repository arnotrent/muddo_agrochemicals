from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('distributors', '0004_fix_hq_address')]
    operations = [
        migrations.AddField(model_name='distributor', name='place_id', field=models.CharField(blank=True, max_length=300)),
    ]
