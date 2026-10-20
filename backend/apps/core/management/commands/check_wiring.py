from django.conf import settings
from django.core.management.base import BaseCommand
from django.test import Client

from apps.core.checks import wiring_problems


def _host():
    for h in settings.ALLOWED_HOSTS:
        if h and h != '*':
            return h.lstrip('.') if not h.startswith('.') else f'api{h}'
    return 'localhost'


class Command(BaseCommand):
    help = 'Verifies Reviews / Leadership / Testimonials / Chat routes exist AND answer (not 404). Exit code 1 on failure.'

    def handle(self, *a, **o):
        bad = 0
        for msg, code in wiring_problems():
            self.stdout.write(self.style.ERROR(f'FAIL {code} {msg}')); bad += 1
        c = Client(HTTP_HOST=_host())
        live = [('/health/', 200), ('/api/v1/leadership/', 200), ('/api/v1/testimonials/', 200), ('/api/v1/faq/', 200),
                ('/api/v1/products/', 200), ('/api/v1/distributors/', 200),
                ('/api/v1/admin/reviews/', 401), ('/api/v1/admin/testimonials/', 401), ('/api/v1/messages/', 401),
                ('/api/v1/notifications/summary/', 401)]
        for path, want in live:
            try:
                got = c.get(path, secure=True).status_code
            except Exception as e:  # noqa: BLE001
                got = f'error {type(e).__name__}: {e}'
            ok = got == want or (want == 401 and got in (401, 403))
            self.stdout.write(f'{self.style.SUCCESS("PASS") if ok else self.style.ERROR("FAIL")}  GET {path} -> {got} (expected {want})')
            bad += 0 if ok else 1
        self.stdout.write(self.style.SUCCESS('All routes answer.') if not bad else self.style.ERROR(f'{bad} problem(s).'))
        raise SystemExit(1 if bad else 0)
