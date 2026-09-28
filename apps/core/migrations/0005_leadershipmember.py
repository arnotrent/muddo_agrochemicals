from django.db import migrations, models


PLACEHOLDERS = [
    ('Name to be announced', 'Managing Director', 'Leads MACL and its relationships with manufacturers, regulators and distributors.'),
    ('Name to be announced', 'Operations & Logistics Manager', 'Keeps stock moving from Kampala to outlets across all four regions.'),
    ('Name to be announced', 'Sales & Agronomy Manager', 'Leads the field-agent team and free agronomy advice to farmers.'),
]


def seed(apps, schema_editor):
    M = apps.get_model('core', 'LeadershipMember')
    if not M.objects.exists():
        for i, (n, t, b) in enumerate(PLACEHOLDERS):
            M.objects.create(name=n, title=t, bio=b, order=i, active=True)


class Migration(migrations.Migration):
    dependencies = [('core', '0004_seed_site_content')]
    operations = [
        migrations.CreateModel(
            name='LeadershipMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('title', models.CharField(max_length=120)),
                ('bio', models.TextField(blank=True, max_length=600)),
                ('photo', models.ImageField(blank=True, null=True, upload_to='leadership/')),
                ('order', models.PositiveIntegerField(default=0)),
                ('active', models.BooleanField(default=True)),
            ],
            options={'ordering': ['order', 'id']},
        ),
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
