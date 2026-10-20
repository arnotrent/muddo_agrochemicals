"""Company contact details used by outgoing e-mail (kept in settings/env so no DB edit is needed)."""
from django.conf import settings

DEFAULT_EMAILS = ['muddoagro811@gmail.com', 'kulangu_w@yahoo.com']
DEFAULT_PHONES = '+256 772 507582 / +256 702 507582'


def _unique(seq):
    seen, out = set(), []
    for e in seq:
        k = (e or '').strip().lower()
        if k and k not in seen:
            seen.add(k)
            out.append(e.strip())
    return out


def company_recipients(site=None):
    """Every company mailbox that should receive a notification — each address ONCE (case-insensitive)."""
    configured = list(getattr(settings, 'COMPANY_NOTIFY_EMAILS', []) or []) or list(DEFAULT_EMAILS)
    primary = getattr(site, 'company_email', None)
    return _unique(([primary] if primary else []) + configured)


def company_contact_line():
    return f"{DEFAULT_PHONES} \u00b7 {' / '.join(company_recipients())}"
