from rest_framework.routers import DefaultRouter
from apps.leadership.api_views import LeaderViewSet

router = DefaultRouter()
router.register('leadership', LeaderViewSet, basename='leader')
urlpatterns = router.urls
