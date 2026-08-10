from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),  # Django's own built-in admin — kept as a break-glass tool

    path('api/v1/auth/', include('apps.core.urls_auth')),
    path('api/v1/', include('apps.core.urls_api')),
    path('api/v1/', include('apps.products.urls_api')),
    path('api/v1/', include('apps.inventory.urls_api')),
    path('api/v1/', include('apps.agents.urls_api')),
    path('api/v1/', include('apps.requests_app.urls_api')),
    path('api/v1/', include('apps.messaging.urls_api')),
    path('api/v1/', include('apps.distributors.urls_api')),
    path('api/v1/', include('apps.analytics.urls_api')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
