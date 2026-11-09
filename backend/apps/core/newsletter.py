"""
Newsletter sign-up with consent, e-mail confirmation (double opt-in) and one-click unsubscribe.

 POST /newsletter/subscribe/    { email, name?, consent: true }   public, throttled, honeypot field `website`
 POST /newsletter/confirm/      { token }                          from the e-mailed link (valid 7 days)
 POST /newsletter/unsubscribe/  { token }                          from the link in every e-mail (never expires)

Double opt-in is on whenever real e-mail sending is configured (settings.NEWSLETTER_DOUBLE_OPT_IN), so nobody can be
signed up by someone else typing their address. Links are signed; confirm/unsubscribe are POSTs so mail scanners that
pre-fetch links cannot trigger them. The consent time and source are recorded.
"""
import logging

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import NewsletterSubscriber
from apps.core.throttles import AuthThrottle, NewsletterThrottle

logger = logging.getLogger('django.request')
SALT = 'muddo-newsletter'
CONFIRM_MAX_AGE = 7 * 24 * 3600
POSTAL = 'Muddo Agro Chemicals LTD, Basement Room V013, Venus Plaza, Container Village, Nakivubo Place, Kampala, Uganda'
TRUE = ('true', '1', 'on', 'yes')


def make_token(email, purpose):
    return signing.dumps({'e': email, 'p': purpose}, salt=SALT)


def read_token(token, purpose, max_age=None):
    try:
        d = signing.loads(token or '', salt=SALT, max_age=max_age)
    except signing.BadSignature:
        return None
    return d.get('e') if d.get('p') == purpose else None


def _link(path, token):
    return f"{settings.FRONTEND_URL.rstrip('/')}/newsletter/{path}?token={token}"


def _send(subject, body, to):
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        return True
    except Exception:  # noqa: BLE001
        logger.exception('Newsletter e-mail to a subscriber failed')
        return False


def _footer(email):
    return f'\n\n--\n{POSTAL}\nStop receiving these e-mails any time: {_link("unsubscribe", make_token(email, "unsub"))}'


def _send_confirmation(sub):
    first = (sub.name or 'there').split(' ')[0]
    return _send('Muddo Agro Chemicals - please confirm your subscription',
                 f"Hello {first},\n\nSomeone (hopefully you) asked to receive news, product updates and farming tips from "
                 f"Muddo Agro Chemicals LTD.\n\nConfirm your subscription (link valid for 7 days):\n"
                 f"{_link('confirm', make_token(sub.email, 'confirm'))}\n\nIf this was not you, ignore this e-mail - "
                 f"you will not be subscribed.\n\nMuddo Agro Chemicals LTD\n{POSTAL}", sub.email)


def _send_welcome(sub):
    first = (sub.name or 'there').split(' ')[0]
    return _send('Welcome to Muddo Agro Chemicals updates',
                 f'Hello {first},\n\nThank you for subscribing. We will send you product news, availability and practical '
                 f'crop-protection advice - never more than we think is useful.' + _footer(sub.email), sub.email)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([NewsletterThrottle])
def subscribe_view(request):
    double = getattr(settings, 'NEWSLETTER_DOUBLE_OPT_IN', False)
    msg = ('Thank you! If this address is new to our list, a confirmation e-mail is on its way - please click the link in it.'
           if double else 'Thank you! You are subscribed to Muddo Agro Chemicals updates.')
    if request.data.get('website'):  # honeypot: pretend success, store nothing
        return Response({'ok': True, 'message': msg}, status=status.HTTP_201_CREATED)
    email = (request.data.get('email') or '').strip().lower()[:254]
    try:
        validate_email(email)
    except DjangoValidationError:
        return Response({'detail': 'Please enter a valid e-mail address.'}, status=status.HTTP_400_BAD_REQUEST)
    if str(request.data.get('consent', '')).lower() not in TRUE:
        return Response({'detail': 'Please tick the box to agree to receive our updates.'}, status=status.HTTP_400_BAD_REQUEST)
    name = ' '.join(str(request.data.get('name') or '').split())[:200]
    now = timezone.now()
    sub, created = NewsletterSubscriber.objects.get_or_create(
        email=email, defaults={'name': name, 'active': not double, 'consent_at': now, 'confirmed_at': None if double else now, 'source': 'website'})
    if not created:
        if sub.active:  # already subscribed - same answer, no e-mail, nothing revealed
            return Response({'ok': True, 'message': msg}, status=status.HTTP_201_CREATED)
        sub.name = name or sub.name
        sub.consent_at, sub.unsubscribed_at = now, None
        if not double:
            sub.active, sub.confirmed_at = True, now
        sub.save()
    if double:
        if cache.add(f'nlconfirm:{sub.pk}', 1, 120):  # one confirmation e-mail per address every 2 minutes
            _send_confirmation(sub)
    elif created or not sub.active:
        _send_welcome(sub)
    return Response({'ok': True, 'message': msg}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def confirm_view(request):
    email = read_token(request.data.get('token'), 'confirm', CONFIRM_MAX_AGE)
    sub = NewsletterSubscriber.objects.filter(email=email).first() if email else None
    if not sub:
        return Response({'detail': 'This confirmation link is invalid or has expired. Please subscribe again.'}, status=400)
    if not sub.active:
        sub.active, sub.confirmed_at, sub.unsubscribed_at = True, timezone.now(), None
        sub.save(update_fields=['active', 'confirmed_at', 'unsubscribed_at'])
        _send_welcome(sub)
    return Response({'ok': True, 'message': 'Your subscription is confirmed. Thank you!'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def unsubscribe_view(request):
    email = read_token(request.data.get('token'), 'unsub')
    if not email:
        return Response({'detail': 'This unsubscribe link is not valid. Contact us and we will remove you manually.'}, status=400)
    NewsletterSubscriber.objects.filter(email=email, active=True).update(active=False, unsubscribed_at=timezone.now())
    return Response({'ok': True, 'message': 'You have been unsubscribed and will not receive further updates.'})
