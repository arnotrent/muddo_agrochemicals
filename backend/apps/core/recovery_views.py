"""
Account recovery.

  1. E-mail link   — POST /auth/password-reset/request/  (username or e-mail)
                     GET  /auth/password-reset/validate/ (uid, token)  -> {valid}
                     POST /auth/password-reset/confirm/  (uid, token, new_password, confirm_password)
  2. E-mail change — POST /auth/change-email/  (logged-in; needs current password)

Security properties:
  * the request endpoint ALWAYS answers the same message (no account enumeration)
  * tokens are Django's signed, single-use tokens (they stop working the moment the password
    changes) and expire after PASSWORD_RESET_TIMEOUT (1 hour)
  * the new password goes through Django's password validators
  * after a reset every outstanding refresh token of that user is blacklisted (all sessions end)
  * throttled per client; plus a per-account cool-down so one inbox cannot be flooded
"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.throttles import AuthThrottle, RecoveryThrottle

User = get_user_model()
logger = logging.getLogger('django.request')

GENERIC = ('If an account matches what you entered and has an e-mail address on file, a reset link has '
           'been sent. The link works for 1 hour. If nothing arrives, check spam or use another recovery option below.')


def _eligible(qs):
    """Only real portal accounts: staff, or agents with an active profile."""
    return [u for u in qs if u.is_active and (u.is_staff or getattr(getattr(u, 'agent_profile', None), 'status', '') == 'active')]


def _blacklist_all_sessions(user):
    try:
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
        for t in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=t)
    except Exception:
        logger.exception('Could not blacklist sessions for user %s', user.pk)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RecoveryThrottle])
def password_reset_request_view(request):
    ident = (request.data.get('identifier') or '').strip()[:150]
    if len(ident) >= 3:
        users = _eligible(User.objects.filter(Q(username__iexact=ident) | Q(email__iexact=ident)).exclude(email=''))
        for user in users[:3]:
            if not cache.add(f'pwreset:{user.pk}', 1, 120):  # 2-minute cool-down per account
                continue
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?uid={uid}&token={token}"
            try:
                send_mail(
                    'Muddo Agro \u2014 reset your password',
                    f"Hello {user.get_full_name() or user.username},\n\n"
                    f"We received a request to reset the password for your Muddo Agro Chemicals account "
                    f"(username: {user.username}).\n\nReset it here (valid for 1 hour, one use):\n{link}\n\n"
                    f"If you did not ask for this, ignore this e-mail \u2014 your password stays unchanged.\n\n"
                    f"Muddo Agro Chemicals LTD",
                    settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
            except Exception:
                logger.exception('Password-reset e-mail failed for user %s', user.pk)
    return Response({'detail': GENERIC})


def _user_from(uid, token):
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid or '')))
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None
    if not _eligible([user]) or not default_token_generator.check_token(user, token or ''):
        return None
    return user


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def password_reset_validate_view(request):
    return Response({'valid': _user_from(request.GET.get('uid'), request.GET.get('token')) is not None})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def password_reset_confirm_view(request):
    user = _user_from(request.data.get('uid'), request.data.get('token'))
    if not user:
        return Response({'detail': 'This reset link is invalid or has expired. Please request a new one.'},
                        status=status.HTTP_400_BAD_REQUEST)
    new, confirm = request.data.get('new_password') or '', request.data.get('confirm_password') or ''
    if new != confirm:
        return Response({'detail': 'The two passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(new, user)
    except DjangoValidationError as e:
        return Response({'detail': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new)
    user.save(update_fields=['password'])
    _blacklist_all_sessions(user)
    return Response({'detail': 'Password updated. You can now sign in with your new password.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthThrottle])
def change_email_view(request):
    """Lets a signed-in user set the REAL e-mail their recovery link is sent to."""
    email = (request.data.get('email') or '').strip().lower()
    if not request.user.check_password(request.data.get('password') or ''):
        return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except DjangoValidationError:
        return Response({'detail': 'Enter a valid e-mail address.'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.email = email
    request.user.save(update_fields=['email'])
    return Response({'detail': 'Recovery e-mail saved.', 'email': email})
