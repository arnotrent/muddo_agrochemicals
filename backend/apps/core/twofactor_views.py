"""
Admin 2FA management + the security-sensitive admin actions that now require a code.
  GET  /admin/2fa/status/            POST /admin/2fa/setup/ {password}
  POST /admin/2fa/enable/ {code}     POST /admin/2fa/disable/ {password, otp}
  POST /admin/2fa/backup-codes/ {password, otp}
  POST /admin/account/change-password/ {old_password,new_password,confirm_password,otp}
  POST /admin/agents/reset-password/   {agent_id,new_password,otp}
"""
import logging

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from apps.agents.models import Agent
from apps.core import twofactor as tfa
from apps.core.models import TwoFactor
from apps.core.permissions import IsAdmin
from apps.core.recovery_views import _blacklist_all_sessions
from apps.core.throttles import OtpThrottle

audit = logging.getLogger('muddo.security')


def _bad(msg, code=400, extra=None):
    return Response({'detail': msg, **(extra or {})}, status=code)


def _pw_ok(request):
    return request.user.check_password(request.data.get('password') or '')


@api_view(['GET'])
@permission_classes([IsAdmin])
def status_view(request):
    tf = getattr(request.user, 'two_factor', None)
    on = bool(tf and tf.enabled)
    return Response({'enabled': on, 'required': tfa.required(), 'backup_codes_left': len(tf.backup_codes) if on else 0,
                     'enabled_at': tf.confirmed_at if on else None})


@api_view(['POST'])
@permission_classes([IsAdmin])
@throttle_classes([OtpThrottle])
def setup_view(request):
    if not _pw_ok(request):
        return _bad('Current password is incorrect.')
    tf, _ = TwoFactor.objects.get_or_create(user=request.user, defaults={'secret': tfa.new_secret()})
    if tf.enabled:
        return _bad('Two-factor authentication is already on. Turn it off first if you want to set it up again.')
    tf.secret, tf.last_used_step, tf.failed_attempts, tf.locked_until = tfa.new_secret(), 0, 0, None
    tf.save()
    uri = tfa.provisioning_uri(request.user, tf.secret)
    return Response({'secret': ' '.join(tf.secret[i:i + 4] for i in range(0, len(tf.secret), 4)),
                     'otpauth_uri': uri, 'qr': tfa.qr_data_url(uri)})


@api_view(['POST'])
@permission_classes([IsAdmin])
@throttle_classes([OtpThrottle])
def enable_view(request):
    tf = getattr(request.user, 'two_factor', None)
    if tf is None or tf.enabled:
        return _bad('Start the setup first.')
    if tfa.is_locked(tf):
        return _bad('Too many wrong codes. Try again in 15 minutes.', 429, {'code': '2fa_locked'})
    if not tfa.verify(tf, request.data.get('code'), allow_backup=False):
        return _bad('That code is not correct. Check the code in your app and try again.', 400, {'code': '2fa_invalid'})
    plain, hashed = tfa.new_backup_codes()
    tf.enabled, tf.confirmed_at, tf.backup_codes = True, timezone.now(), hashed
    tf.save()
    audit.info('2FA enabled for %s', request.user.username)
    return Response({'enabled': True, 'backup_codes': plain})


@api_view(['POST'])
@permission_classes([IsAdmin])
@throttle_classes([OtpThrottle])
def disable_view(request):
    if not _pw_ok(request):
        return _bad('Current password is incorrect.')
    blocked = tfa.gate(request.user, request.data.get('otp'), enforce_setup=False)
    if blocked:
        return blocked
    TwoFactor.objects.filter(user=request.user).delete()
    audit.warning('2FA DISABLED for %s', request.user.username)
    return Response({'enabled': False, 'detail': 'Two-factor authentication is now off.'})


@api_view(['POST'])
@permission_classes([IsAdmin])
@throttle_classes([OtpThrottle])
def backup_codes_view(request):
    if not _pw_ok(request):
        return _bad('Current password is incorrect.')
    if not tfa.enabled_for(request.user):
        return _bad('Turn two-factor authentication on first.')
    blocked = tfa.gate(request.user, request.data.get('otp'))
    if blocked:
        return blocked
    plain, hashed = tfa.new_backup_codes()
    tf = request.user.two_factor
    tf.backup_codes = hashed
    tf.save(update_fields=['backup_codes'])
    audit.info('2FA backup codes regenerated for %s', request.user.username)
    return Response({'backup_codes': plain})


@api_view(['POST'])
@permission_classes([IsAdmin])
@throttle_classes([OtpThrottle])
def change_password_view(request):
    """Admin's own password. Needs the current password AND a 2FA code; ends every session afterwards."""
    d = request.data
    old, new, confirm = d.get('old_password', ''), d.get('new_password', ''), d.get('confirm_password', '')
    if not request.user.check_password(old):
        return _bad('Current password is incorrect.')
    blocked = tfa.gate(request.user, d.get('otp'))
    if blocked:
        return blocked
    if new != confirm:
        return _bad('Passwords do not match.')
    try:
        validate_password(new, request.user)
    except DjangoValidationError as e:
        return _bad(' '.join(e.messages))
    request.user.set_password(new)
    request.user.save(update_fields=['password'])
    _blacklist_all_sessions(request.user)
    audit.warning('Admin password changed for %s', request.user.username)
    return Response({'detail': 'Password updated. Please log in again.'})


@api_view(['POST'])
@permission_classes([IsAdmin])
@throttle_classes([OtpThrottle])
def reset_agent_password_view(request):
    d = request.data
    pw = d.get('new_password') or d.get('new_agent_password') or ''   # the old screen sent new_agent_password
    if len(pw) < 6:
        return _bad('Password must be at least 6 characters.')
    agent = get_object_or_404(Agent, pk=d.get('agent_id'))
    blocked = tfa.gate(request.user, d.get('otp'))
    if blocked:
        return blocked
    agent.user.set_password(pw)
    agent.user.save(update_fields=['password'])
    _blacklist_all_sessions(agent.user)
    audit.warning('Agent password reset for %s by %s', agent.user.username, request.user.username)
    return Response({'detail': f'Password reset for {agent.name}.'})
