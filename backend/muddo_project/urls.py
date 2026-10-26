from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.http import JsonResponse


def root_health_check(request):
    return JsonResponse({"status": "healthy", "service": "Muddo Agrochemicals API", "version": "v1"})


urlpatterns = [
    # Health checks & root aliases
    path('', root_health_check),
    path('health/', root_health_check),
    path('api/health/', root_health_check),
    path('api/v1/', root_health_check),

    path('django-admin/', admin.site.urls),

    # API — EVERY app is wired here.
    path('api/v1/auth/', include('apps.core.urls_auth')),
    path('api/v1/', include('apps.core.urls_api')),
    path('api/v1/', include('apps.products.urls_api')),        # products + /reviews/ + /admin/reviews/
    path('api/v1/', include('apps.inventory.urls_api')),
    path('api/v1/', include('apps.agents.urls_api')),
    path('api/v1/', include('apps.requests_app.urls_api')),
    path('api/v1/', include('apps.messaging.urls_api')),
    path('api/v1/', include('apps.distributors.urls_api')),
    path('api/v1/', include('apps.analytics.urls_api')),
    path('api/v1/', include('apps.leadership.urls_api')),
    path('api/v1/', include('apps.testimonials.urls_api')),
]

if not settings.USE_S3_MEDIA:
    # Uploaded pictures live in the database (apps/core/db_storage.py) and are served from there, in development AND
    # production, so they are never lost when the host's disk is wiped.
    from apps.core.media_views import serve_media
    urlpatterns += [re_path(r'^media/(?P<path>.*)$', serve_media)]
