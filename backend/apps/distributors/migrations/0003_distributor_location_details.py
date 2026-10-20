from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('distributors', '0002_distributor_country_and_free_region')]
    operations = [
        migrations.AddField(model_name='distributor', name='town',
                            field=models.CharField(blank=True, max_length=120)),
        migrations.AddField(model_name='distributor', name='location_details',
                            field=models.TextField(blank=True, max_length=1000)),
    ]
