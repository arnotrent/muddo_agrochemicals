from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('testimonials', '0001_initial')]
    operations = [
        migrations.AlterField(
            model_name='testimonial', name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('hidden', 'Hidden'),
                                            ('rejected', 'Rejected')], db_index=True, default='pending', max_length=10)),
    ]
