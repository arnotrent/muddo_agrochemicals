"""
Real rate limits that never crash the request. Every scope has a built-in default, so a missing
entry in settings can never turn into an HTTP 500 (ImproperlyConfigured).
"""
from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle

DEFAULT_RATES = {
    'auth': '10/min',
    'newsletter': '10/min',
    'review': '5/hour',
    'chat': '90/min',
    'testimonial': '8/hour',
    'contact': '5/min',
    'track': '20/min',
    'recovery': '6/hour',
}


class _PerClientThrottle(SimpleRateThrottle):
    def get_rate(self):
        configured = (getattr(settings, 'REST_FRAMEWORK', {}) or {}).get('DEFAULT_THROTTLE_RATES', {}) or {}
        return configured.get(self.scope) or DEFAULT_RATES[self.scope]

    def get_cache_key(self, request, view):
        user = getattr(request, 'user', None)
        ident = user.pk if user is not None and user.is_authenticated else self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class AuthThrottle(_PerClientThrottle): scope = 'auth'
class NewsletterThrottle(_PerClientThrottle): scope = 'newsletter'
class ReviewThrottle(_PerClientThrottle): scope = 'review'
class ChatSendThrottle(_PerClientThrottle): scope = 'chat'
class TestimonialThrottle(_PerClientThrottle): scope = 'testimonial'
class ContactThrottle(_PerClientThrottle): scope = 'contact'
class TrackThrottle(_PerClientThrottle): scope = 'track'
class RecoveryThrottle(_PerClientThrottle): scope = 'recovery'
