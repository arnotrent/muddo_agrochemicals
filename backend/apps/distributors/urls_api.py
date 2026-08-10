from rest_framework.routers import DefaultRouter
from apps.distributors.api_views import DistributorViewSet

router = DefaultRouter()
router.register('distributors', DistributorViewSet, basename='distributor')

urlpatterns = router.urls
