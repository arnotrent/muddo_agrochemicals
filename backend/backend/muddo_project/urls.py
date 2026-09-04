from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health_view(request):
    """
    Plain, unauthenticated 200 OK — for Render health checks, uptime
    monitors, and quickly confirming "is the backend actually deployed
    and running" independent of the database or any app logic.
    """
    return JsonResponse({'status': 'ok', 'service': 'muddo-agro-api'})


@require_GET
def root_view(request):
    """
    The bare domain root has no meaning for a JSON API — but returning a
    plain 404 there makes it look like the whole service is down when
    someone (or a health check) just hits '/'. This gives a real 200
    with a pointer to where the actual API lives.
    """
    return JsonResponse({
        'service': 'Muddo Agro Chemicals LTD — API',
        'status': 'ok',
        'api_root': request.build_absolute_uri('/api/v1/'),
        'health': request.build_absolute_uri('/health/'),
        'admin': request.build_absolute_uri('/django-admin/'),
    })


urlpatterns = [
    path('', root_view, name='api_root'),
    path('health/', health_view, name='health_check'),

    path('django-admin/', admin.site.urls),  # Django's own built-in admin — kept as a break-glass tool

    path('api/v1/health/', health_view, name='api_health_check'),
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
