"""
Real rate limits.

The original code set `view.throttle_scope = ...` INSIDE the function body of
function-based views. DRF's ScopedRateThrottle reads the scope BEFORE the body
runs (and the attribute landed on the function, not the generated view class),
so login/newsletter throttling never actually applied. These explicit classes
fix that. Rates live in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
"""
from rest_framework.throttling import SimpleRateThrottle


class _PerClientThrottle(SimpleRateThrottle):
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
