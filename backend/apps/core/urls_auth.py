from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.core.auth_views import login_view, logout_view, me_view
from apps.core.recovery_views import (
    password_reset_request_view, password_reset_validate_view, password_reset_confirm_view, change_email_view,
)

urlpatterns = [
    path('login/', login_view, name='api_login'),
    path('logout/', logout_view, name='api_logout'),
    path('refresh/', TokenRefreshView.as_view(), name='api_token_refresh'),
    path('me/', me_view, name='api_me'),
    path('password-reset/request/', password_reset_request_view, name='api_pw_reset_request'),
    path('password-reset/validate/', password_reset_validate_view, name='api_pw_reset_validate'),
    path('password-reset/confirm/', password_reset_confirm_view, name='api_pw_reset_confirm'),
    path('change-email/', change_email_view, name='api_change_email'),
]
