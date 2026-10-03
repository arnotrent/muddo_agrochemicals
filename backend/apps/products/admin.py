from django.contrib import admin
from .models import Product, ProductReview

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display=['name','category','active_ingredient','packing','created_at']
    list_filter=['category']; search_fields=['name','active_ingredient','crops']

@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display=['product','name','rating','status','created_at']
    list_filter=['status','rating']; search_fields=['name','comment','product__name']
