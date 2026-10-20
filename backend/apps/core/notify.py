"""Company contact details used by outgoing e-mail (kept in settings/env so no DB edit is needed)."""
from django.conf import settings

DEFAULT_EMAILS = ['muddoagro811@gmail.com', 'kulangu_w@yahoo.com']
DEFAULT_PHONES = '+256 772 507582 / +256 702 507582'


def company_recipients(site=None):
    """Every company mailbox that should receive a new-enquiry notification."""
    configured = list(getattr(settings, 'COMPANY_NOTIFY_EMAILS', []) or [])
    out = configured or list(DEFAULT_EMAILS)
    primary = getattr(site, 'company_email', None)
    if primary and primary not in out:
        out.insert(0, primary)
    return out


def company_contact_line():
    emails = ' / '.join(company_recipients())
    return f'{DEFAULT_PHONES} \u00b7 {emails}'
