import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [('products', '0003_productreview')]
    operations = [
        migrations.CreateModel(
            name='Testimonial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('role', models.CharField(blank=True, max_length=120)),
                ('message', models.TextField(max_length=1000)),
                ('rating', models.PositiveSmallIntegerField(blank=True, null=True, validators=[
                    django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('photo', models.ImageField(blank=True, null=True, upload_to='testimonials/')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'),
                                                     ('rejected', 'Rejected')], db_index=True,
                                            default='pending', max_length=10)),
                ('source', models.CharField(choices=[('public', 'Public form'), ('admin', 'Added by admin')],
                                            default='public', max_length=10)),
                ('order', models.PositiveIntegerField(default=0)),
                ('ip_hash', models.CharField(blank=True, max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('moderated_at', models.DateTimeField(blank=True, null=True)),
                ('moderated_by', models.CharField(blank=True, max_length=150)),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                              related_name='testimonials', to='products.product')),
            ],
            options={'ordering': ['order', '-created_at']},
        ),
    ]
