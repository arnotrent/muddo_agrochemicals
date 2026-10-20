from django.contrib import admin
from .models import Testimonial

@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['name', 'role', 'status', 'source', 'created_at']
    list_filter = ['status', 'source']
    search_fields = ['name', 'message']
