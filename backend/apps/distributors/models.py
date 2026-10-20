from django.db import models

class Distributor(models.Model):
    REGIONS = [('Central', 'Central'), ('Eastern', 'Eastern'), ('Northern', 'Northern'), ('Western', 'Western')]

    COUNTRIES = [
        ('Uganda', 'Uganda'), ('Kenya', 'Kenya'), ('Tanzania', 'Tanzania'),
        ('Rwanda', 'Rwanda'), ('Burundi', 'Burundi'), ('South Sudan', 'South Sudan'),
        ('DR Congo', 'DR Congo'), ('Other', 'Other'),
    ]

    country  = models.CharField(max_length=100, choices=COUNTRIES, default='Uganda')
    name     = models.CharField(max_length=200)
    region   = models.CharField(max_length=100)          # region / state / province
    district = models.CharField(max_length=100)          # district / county / city
    town     = models.CharField(max_length=120, blank=True)   # city / town / trading centre (optional)
    address  = models.CharField(max_length=300, blank=True)
    # Optional "how to find us" text: landmarks, floor, nearby buildings, opening notes…
    location_details = models.TextField(blank=True, max_length=1000)
    phone    = models.CharField(max_length=30, blank=True)
    email    = models.EmailField(blank=True)
    lat      = models.FloatField(default=0.0)
    lng      = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['country', 'region', 'district', 'name']

    def __str__(self):
        return f"{self.name} ({self.region}, {self.country})"
