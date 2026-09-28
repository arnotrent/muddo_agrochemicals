from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count
from django.urls import reverse

CATS = [('pesticide','Pesticide'),('herbicide','Herbicide'),('fungicide','Fungicide'),('other','Other / Agri Input')]

class Product(models.Model):
    name              = models.CharField(max_length=200)
    category          = models.CharField(max_length=20, choices=CATS)
    description       = models.TextField(blank=True)
    active_ingredient = models.CharField(max_length=300, blank=True)
    formulation       = models.CharField(max_length=200, blank=True)
    crops             = models.CharField(max_length=300, blank=True)
    dosage            = models.CharField(max_length=200, blank=True)
    packing           = models.CharField(max_length=200, blank=True)
    image_url         = models.CharField(max_length=500, blank=True)
    image_file        = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    class Meta: ordering=['category','name']
    def __str__(self): return f"{self.name} ({self.get_category_display()})"
    def get_absolute_url(self): return reverse('product_detail',args=[self.pk])
    @property
    def display_image(self):
        if self.image_file: return self.image_file.url
        if self.image_url:  return self.image_url
        return '/static/images/products_all.jpg'
    @property
    def stock_qty(self):
        try: return self.inventory.stock_qty
        except: return 0
    @property
    def stock_status(self):
        q=self.stock_qty
        if q==0: return 'out'
        if q<=10: return 'low'
        return 'in'
    @property
    def review_stats(self):
        """{'avg': 4.3, 'count': 7} over APPROVED reviews only."""
        r = self.reviews.filter(status='approved').aggregate(avg=Avg('rating'), n=Count('id'))
        return {'avg': round(r['avg'], 1) if r['avg'] else 0, 'count': r['n']}


class ProductImage(models.Model):
    """Extra photos for a product page (package shots, field photos) - never replaces the main image."""
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='gallery')
    image_file = models.ImageField(upload_to='products/gallery/', blank=True, null=True)
    image_url  = models.CharField(max_length=500, blank=True, help_text='Static path or full URL (used when no file is uploaded).')
    caption    = models.CharField(max_length=200, blank=True)
    order      = models.PositiveIntegerField(default=0)
    class Meta:
        ordering = ['order', 'id']
    def __str__(self): return f'{self.product.name} - {self.caption or "photo"}'
    @property
    def display_url(self):
        if self.image_file: return self.image_file.url
        return self.image_url


class ProductReview(models.Model):
    """Public product review. Nothing is shown on the site until an admin approves it."""
    STATUS = [('pending','Pending'),('approved','Approved'),('rejected','Rejected')]
    product      = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    name         = models.CharField(max_length=80)
    location     = models.CharField(max_length=80, blank=True)
    email        = models.EmailField(blank=True)            # never displayed publicly
    rating       = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title        = models.CharField(max_length=100, blank=True)
    comment      = models.TextField(max_length=1500)
    status       = models.CharField(max_length=10, choices=STATUS, default='pending', db_index=True)
    submitter_hash = models.CharField(max_length=64, blank=True, db_index=True)   # salted hash, not the raw IP
    created_at   = models.DateTimeField(auto_now_add=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.CharField(max_length=150, blank=True)
    class Meta:
        ordering = ['-created_at']
    def __str__(self): return f'{self.product.name} - {self.rating}★ by {self.name} [{self.status}]'
