from django.core.management.base import BaseCommand
from apps.messaging.diagnostics import run_checks


class Command(BaseCommand):
    help = 'Self-test for the chat / attachment system (migrations, tables, saving, storage).'

    def handle(self, *a, **o):
        bad = 0
        for c in run_checks():
            mark = self.style.SUCCESS('PASS') if c['ok'] else (self.style.WARNING('WARN') if c['level'] == 'warn' else self.style.ERROR('FAIL'))
            self.stdout.write(f"{mark}  {c['name']}: {c['detail']}")
            if not c['ok']:
                self.stdout.write(f"      fix: {c['fix']}")
                if c['level'] != 'warn':
                    bad += 1
        raise SystemExit(1 if bad else 0)
