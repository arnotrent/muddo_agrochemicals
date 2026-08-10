from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.products.api_views import ProductViewSet, product_related_view, product_spec_sheet_view

router = DefaultRouter()
router.register('products', ProductViewSet, basename='product')

urlpatterns = router.urls + [
    path('products/<int:pk>/related/', product_related_view, name='api_product_related'),
    path('products/<int:pk>/spec-sheet/', product_spec_sheet_view, name='api_product_spec_sheet'),
]
