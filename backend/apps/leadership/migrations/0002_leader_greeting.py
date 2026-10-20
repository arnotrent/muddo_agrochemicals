from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('leadership', '0001_initial')]
    operations = [
        migrations.AddField(model_name='leader', name='greeting', field=models.TextField(blank=True, max_length=1500)),
    ]
