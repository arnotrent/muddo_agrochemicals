"""Signed, expiring tokens that let a visitor edit/delete THEIR OWN review (no account needed)."""
from django.core import signing

SALT = 'muddo-review-edit'
MAX_AGE = 14 * 24 * 3600


def make(kind, pk):
    return signing.dumps({'k': kind, 'i': pk}, salt=SALT)


def read(token):
    try:
        d = signing.loads(token, salt=SALT, max_age=MAX_AGE)
        return d['k'], d['i']
    except (signing.BadSignature, KeyError):
        return None
