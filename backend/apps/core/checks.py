"""
Deploy-time wiring check. Runs on every `manage.py check` / `migrate` — and the Render build command runs
`manage.py check --fail-level ERROR` — so a deploy with a missing route or app FAILS LOUDLY at build time
instead of shipping 404s for Reviews, Leadership or Testimonials.
"""
from django.apps import apps
from django.core.checks import Error, register
from django.urls import NoReverseMatch, reverse

REQUIRED_APPS = ['apps.products', 'apps.leadership', 'apps.testimonials', 'apps.messaging', 'apps.distributors']

# route name -> reverse() args
REQUIRED_ROUTES = {
    'api_product_reviews': [1], 'api_admin_reviews': [], 'api_admin_review_detail': [1],
    'leader-list': [], 'leader-detail': [1],
    'api_testimonials': [], 'api_testimonial_submit': [], 'api_admin_testimonials': [], 'api_admin_testimonial_detail': [1],
    'api_notifications_summary': [], 'api_admin_enquiry_reply': [1], 'api_admin_enquiry_assign': [1], 'api_agent_enquiries': [], 'api_pw_reset_request': [], 'api_pw_reset_confirm': [],
    'api_messages_list': [], 'api_messages_send': [], 'api_admin_chat_contacts': [], 'api_agent_chat_contacts': [],
}


def wiring_problems():
    problems = []
    for name in REQUIRED_APPS:
        if not apps.is_installed(name):
            problems.append((f'{name} is missing from INSTALLED_APPS (settings.py).', 'muddo.E001'))
    for name, args in REQUIRED_ROUTES.items():
        try:
            reverse(name, args=args)
        except NoReverseMatch:
            problems.append((f'API route "{name}" is not registered — include its urls_api in muddo_project/urls.py.', 'muddo.E002'))
    return problems


@register()
def wiring_check(app_configs, **kwargs):
    return [Error(msg, id=code) for msg, code in wiring_problems()]
