from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.urls import reverse

CATS = [('pesticide','Pesticide'),('herbicide','Herbicide'),('fungicide','Fungicide'),('other','Other / Agri Input')]

class Product(models.Model):
    name              = models.CharField(max_length=200)
    category          = models.CharField(max_length=20, choices=CATS)
    description       = models.TextField(blank=True)
    # Bullet-point application/usage steps, one per line — shown separately
    # from `description` on the product detail page (the "extended
    # details" section), kept out of the short card-view text entirely.
    usage_instructions = models.TextField(blank=True)
    active_ingredient = models.CharField(max_length=300, blank=True)
    formulation        = models.CharField(max_length=200, blank=True)
    crops              = models.CharField(max_length=300, blank=True)
    dosage             = models.CharField(max_length=200, blank=True)
    packing            = models.CharField(max_length=200, blank=True)
    image_url          = models.CharField(max_length=500, blank=True)
    image_file         = models.ImageField(upload_to='products/', blank=True, null=True)
    # A product still being processed / not yet released to stock. It's
    # shown as a "Featured" preview (on the homepage and its category
    # page) instead of showing stock status, and is excluded from normal
    # stock-out messaging until an admin flips this off once real stock
    # is added — see apps/products/serializers.py / api_views.py.
    is_featured         = models.BooleanField(default=False)
    created_at         = models.DateTimeField(auto_now_add=True)
    class Meta: ordering=['category','name']
    def __str__(self): return f"{self.name} ({self.get_category_display()})"
    def get_absolute_url(self): return reverse('product_detail',args=[self.pk])
    @property
    def display_image(self):
        if self.image_file: return self.image_file.url
        if self.image_url:  return self.image_url
        return '/images/products_all.jpg'
    @property
    def stock_qty(self):
        try: return self.inventory.stock_qty
        except: return 0
    @property
    def stock_status(self):
        if self.is_featured: return 'featured'
        q=self.stock_qty
        if q==0: return 'out'
        if q<=10: return 'low'
        return 'in'


class ProductReview(models.Model):
    """Public product review. Always starts 'pending'; only 'approved' reviews are ever shown."""
    STATUS = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    name = models.CharField(max_length=80)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(max_length=1500)
    status = models.CharField(max_length=10, choices=STATUS, default='pending', db_index=True)
    ip_hash = models.CharField(max_length=64, blank=True)  # salted hash, never the raw IP
    created_at = models.DateTimeField(auto_now_add=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.product.name} — {self.rating}★ by {self.name} [{self.status}]'
