"""
Two-factor authentication (TOTP, RFC 6238) — standard library only, works with Google Authenticator, Microsoft
Authenticator, Authy, 1Password, etc.

 gate(user, otp)  -> None when allowed, else a ready-made DRF Response (403 / 400 / 429) the view returns as is.
 verify(tf, code) -> True/False. Accepts the current 30 s code ±1 step (clock drift), refuses a code that was already
                     used (replay), accepts one-time backup codes, and locks after 5 wrong tries for 15 minutes.

Set ADMIN_2FA_REQUIRED=false in the environment only as an emergency switch (it stops FORCING 2FA setup; accounts that
have already enabled 2FA are still always asked for their code).
"""
import base64
import hashlib
import hmac
import io
import os
import secrets
import struct
import time
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from django.utils import timezone
from rest_framework.response import Response

STEP = 30
DIGITS = 6
MAX_FAILS = 5
LOCK_MINUTES = 15
ISSUER = 'Muddo Agro Chemicals'
_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'


def required():
    return os.environ.get('ADMIN_2FA_REQUIRED', 'true').strip().lower() not in ('0', 'false', 'no', 'off')


# ── TOTP primitives ────────────────────────────────────────────────
def new_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')


def totp(secret, step):
    key = base64.b32decode(secret + '=' * (-len(secret) % 8), casefold=True)
    mac = hmac.new(key, struct.pack('>Q', step), hashlib.sha1).digest()
    off = mac[-1] & 0x0F
    num = (struct.unpack('>I', mac[off:off + 4])[0] & 0x7FFFFFFF) % (10 ** DIGITS)
    return f'{num:0{DIGITS}d}'


def provisioning_uri(user, secret):
    label = quote(f'{ISSUER}:{user.username}')
    return f'otpauth://totp/{label}?secret={secret}&issuer={quote(ISSUER)}&algorithm=SHA1&digits={DIGITS}&period={STEP}'


def qr_data_url(uri):
    """PNG data-URL of the QR code, or None when the qrcode package is unavailable (the manual key still works)."""
    try:
        import qrcode
        buf = io.BytesIO()
        qrcode.make(uri, box_size=6, border=2).save(buf, 'PNG')
        return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    except Exception:  # noqa: BLE001
        return None


# ── backup codes ───────────────────────────────────────────────────
def _norm(code):
    return ''.join(ch for ch in (code or '').lower() if ch.isalnum())


def _hash(code):
    return hmac.new(settings.SECRET_KEY.encode(), _norm(code).encode(), hashlib.sha256).hexdigest()


def new_backup_codes(n=8):
    plain = [''.join(secrets.choice(_CODE_ALPHABET) for _ in range(10)) for _ in range(n)]
    return [f'{c[:5]}-{c[5:]}' for c in plain], [_hash(c) for c in plain]


# ── verification ───────────────────────────────────────────────────
def is_locked(tf):
    return bool(tf.locked_until and tf.locked_until > timezone.now())


def verify(tf, code, allow_backup=True):
    if is_locked(tf):
        return False
    raw = (code or '').strip()
    compact = raw.replace(' ', '')
    ok = False
    if compact.isdigit() and len(compact) == DIGITS:
        now_step = int(time.time() // STEP)
        for step in (now_step - 1, now_step, now_step + 1):
            match = hmac.compare_digest(totp(tf.secret, step), compact)
            if match and step > tf.last_used_step and not ok:
                tf.last_used_step = step
                ok = True
    elif allow_backup and raw:
        h = _hash(raw)
        hit = next((c for c in tf.backup_codes if hmac.compare_digest(c, h)), None)
        if hit:
            tf.backup_codes = [c for c in tf.backup_codes if c != hit]
            ok = True
    if ok:
        tf.failed_attempts, tf.locked_until = 0, None
    else:
        tf.failed_attempts += 1
        if tf.failed_attempts >= MAX_FAILS:
            tf.failed_attempts = 0
            tf.locked_until = timezone.now() + timedelta(minutes=LOCK_MINUTES)
    tf.save()
    return ok


def _deny(detail, code, status):
    return Response({'detail': detail, 'code': code}, status=status)


def gate(user, otp, enforce_setup=True):
    """None = allowed. Otherwise return the Response from the view."""
    tf = getattr(user, 'two_factor', None)
    if tf is None or not tf.enabled:
        if enforce_setup and required():
            return _deny('Two-factor authentication must be switched on first. Open Settings \u2192 Two-factor authentication, '
                         'scan the QR code with your authenticator app, then try again.', '2fa_setup_required', 403)
        return None
    if is_locked(tf):
        return _deny(f'Too many wrong codes. Try again in {LOCK_MINUTES} minutes.', '2fa_locked', 429)
    if not (otp or '').strip():
        return _deny('Enter the 6-digit code from your authenticator app (or one of your backup codes).', '2fa_required', 403)
    if not verify(tf, otp):
        if is_locked(tf):
            return _deny(f'Too many wrong codes. Try again in {LOCK_MINUTES} minutes.', '2fa_locked', 429)
        return _deny('That code is not correct or has already been used. Wait for the next code and try again.', '2fa_invalid', 400)
    return None


def enabled_for(user):
    tf = getattr(user, 'two_factor', None)
    return bool(tf and tf.enabled)
