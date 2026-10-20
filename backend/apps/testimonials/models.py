from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.media import public_media_url


class Testimonial(models.Model):
    """
    A customer review of Muddo Agro / its products shown on the website.
    Public submissions start 'pending' and are never shown until an admin approves them.
    """
    STATUS = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]
    SOURCE = [('public', 'Public form'), ('admin', 'Added by admin')]

    name = models.CharField(max_length=80)
    role = models.CharField(max_length=120, blank=True)
    message = models.TextField(max_length=1000)
    rating = models.PositiveSmallIntegerField(null=True, blank=True,
                                              validators=[MinValueValidator(1), MaxValueValidator(5)])
    photo = models.ImageField(upload_to='testimonials/', blank=True, null=True)
    product = models.ForeignKey('products.Product', null=True, blank=True, on_delete=models.SET_NULL,
                                related_name='testimonials')
    status = models.CharField(max_length=10, choices=STATUS, default='pending', db_index=True)
    source = models.CharField(max_length=10, choices=SOURCE, default='public')
    order = models.PositiveIntegerField(default=0)
    ip_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f'{self.name} [{self.status}]'

    @property
    def photo_path(self):
        return public_media_url(self.photo)
