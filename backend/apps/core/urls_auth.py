from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.core.auth_views import login_view, logout_view, me_view

urlpatterns = [
    path('login/', login_view, name='api_login'),
    path('logout/', logout_view, name='api_logout'),
    path('refresh/', TokenRefreshView.as_view(), name='api_token_refresh'),
    path('me/', me_view, name='api_me'),
]
