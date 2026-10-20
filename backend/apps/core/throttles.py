"""
Real rate limits that never crash the request.

Two historical problems are fixed here:
 1. The original code set `view.throttle_scope = ...` INSIDE the view body, so login /
    newsletter throttling never applied.
 2. Throttle classes that read their rate ONLY from settings raise ImproperlyConfigured
    (-> a generic HTTP 500 "An unexpected error occurred") whenever the scope is missing
    from REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] — e.g. if settings.py wasn't patched.
    Every scope below therefore has a built-in default; settings may still override it.
"""
from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle

DEFAULT_RATES = {
    'auth': '10/min',
    'newsletter': '10/min',
    'review': '5/hour',
    'chat': '90/min',
    'testimonial': '8/hour',
}


class _PerClientThrottle(SimpleRateThrottle):
    def get_rate(self):
        configured = (getattr(settings, 'REST_FRAMEWORK', {}) or {}).get('DEFAULT_THROTTLE_RATES', {}) or {}
        return configured.get(self.scope) or DEFAULT_RATES[self.scope]

    def get_cache_key(self, request, view):
        user = getattr(request, 'user', None)
        ident = user.pk if user is not None and user.is_authenticated else self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class AuthThrottle(_PerClientThrottle):
    scope = 'auth'


class NewsletterThrottle(_PerClientThrottle):
    scope = 'newsletter'


class ReviewThrottle(_PerClientThrottle):
    scope = 'review'


class ChatSendThrottle(_PerClientThrottle):
    scope = 'chat'


class TestimonialThrottle(_PerClientThrottle):
    scope = 'testimonial'
