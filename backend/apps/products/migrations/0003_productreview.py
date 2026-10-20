import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('products', '0002_product_usage_featured')]
    operations = [
        migrations.CreateModel(
            name='ProductReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('rating', models.PositiveSmallIntegerField(validators=[
                    django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('comment', models.TextField(max_length=1500)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'),
                                                     ('rejected', 'Rejected')], db_index=True,
                                            default='pending', max_length=10)),
                ('ip_hash', models.CharField(blank=True, max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('moderated_at', models.DateTimeField(blank=True, null=True)),
                ('moderated_by', models.CharField(blank=True, max_length=150)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                              related_name='reviews', to='products.product')),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
