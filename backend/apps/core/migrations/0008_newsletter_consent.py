from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0007_mediafile')]
    operations = [
        migrations.AddField(model_name='newslettersubscriber', name='consent_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='newslettersubscriber', name='confirmed_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='newslettersubscriber', name='unsubscribed_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='newslettersubscriber', name='source', field=models.CharField(blank=True, default='', max_length=30)),
    ]
