from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0006_storedfile')]
    operations = [
        migrations.CreateModel(
            name='MediaFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=300, unique=True)),
                ('data', models.BinaryField()),
                ('content_type', models.CharField(blank=True, max_length=100)),
                ('size', models.BigIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
