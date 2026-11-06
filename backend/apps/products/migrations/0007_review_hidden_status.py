from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('products', '0006_remove_foliar_boost')]
    operations = [
        migrations.AlterField(
            model_name='productreview', name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('hidden', 'Hidden'),
                                            ('rejected', 'Rejected')], db_index=True, default='pending', max_length=10)),
    ]
