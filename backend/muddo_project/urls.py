from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def root_health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "Muddo Agrochemicals API",
        "version": "v1"
    })

urlpatterns = [
    # Health checks & Root aliases
    path('', root_health_check),
    path('health/', root_health_check),
    path('api/health/', root_health_check),     # Fixes /api/health 404
    path('api/v1/', root_health_check),         # Fixes /api/v1 404
    
    # Django Admin
    path('django-admin/', admin.site.urls),

    # App API Endpoints
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
