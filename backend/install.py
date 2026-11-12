"""Apply the contact feature to an existing family-menu backend checkout.

Defaults to a dry run. This script never changes environment secrets, runs migrations,
restarts containers or publishes web files.
"""
import argparse
import shutil
from datetime import datetime, timezone
from pathlib import Path

OVERLAY = Path(__file__).resolve().parent / 'overlay'
SETTINGS = '''
    # Personal site contact messages: database outbox + SMTP notification.
    contact_notification_enabled: bool = False
    contact_notification_to: str = ""
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_ssl: bool = True
    contact_rate_limit_salt: str = ""
    contact_rate_limit_window_seconds: int = 300
    contact_rate_limit_max_submissions: int = 3
    contact_hourly_limit: int = 60
    contact_allowed_origins: str = "https://zmeety.cn,https://www.zmeety.cn,http://127.0.0.1:8123,http://localhost:8123"
    contact_trusted_proxies: str = "127.0.0.1,::1"
'''


def integrate(target: Path, apply: bool = False):
    target = target.resolve(strict=True)
    originals = {}
    changes = {}
    for name in ('app/core/config.py', 'app/models/__init__.py', 'app/api/v1/router.py', 'alembic/env.py', 'app/main.py'):
        path = target / name
        original = path.read_text(encoding='utf-8')
        originals[name] = original
        updated = original
        if name == 'app/core/config.py':
            if 'contact_notification_enabled:' not in original:
                anchor = '    api_prefix: str = "/api/v1"'
                if anchor not in original:
                    raise RuntimeError('Unknown config layout; inspect app/core/config.py before applying')
                updated = original.replace(anchor, anchor + '\n' + SETTINGS, 1)
        elif name == 'app/models/__init__.py':
            if 'from app.models.contact_message import ContactMessage' not in original:
                updated += '\nfrom app.models.contact_message import ContactMessage\n'
        elif name == 'app/api/v1/router.py':
            if 'include_router(contact_messages.router)' not in original:
                updated += '\nfrom app.api.v1 import contact_messages\napi_router.include_router(contact_messages.router)\n'
        elif name == 'alembic/env.py':
            if 'from app.models import contact_message' not in original:
                anchor = 'target_metadata = Base.metadata'
                if anchor not in original:
                    raise RuntimeError('Unknown Alembic metadata layout')
                updated = original.replace(anchor, 'from app.models import contact_message  # noqa: F401\n\n' + anchor, 1)
        elif name == 'app/main.py':
            if 'async with contact_notification_lifespan():' not in original:
                anchor = '    yield\n'
                if original.count(anchor) != 1:
                    raise RuntimeError('Main lifespan changed; inspect before integrating')
                updated = original.replace(anchor, '    async with contact_notification_lifespan():\n        yield\n', 1)
                updated = 'from app.services.contact_message_service import contact_notification_lifespan\n' + updated
        if updated != original:
            compile(updated, str(path), 'exec')
            changes[name] = updated
    for source in OVERLAY.rglob('*.py'):
        name = source.relative_to(OVERLAY).as_posix()
        content = source.read_text(encoding='utf-8')
        compile(content, name, 'exec')
        destination = target / name
        if destination.exists():
            original = destination.read_text(encoding='utf-8')
            if original == content:
                continue
            # An already changed migration must never be silently overwritten.
            if name.startswith('alembic/versions/'):
                raise RuntimeError(f'Migration differs: {destination}; check whether it has already run')
            originals[name] = original
        changes[name] = content
    print(('APPLY' if apply else 'DRY RUN'), target)
    for name in changes:
        print(' ', name)
    if not apply or not changes:
        return changes
    backup = target.parent / ('contact-backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir()
    for name in changes:
        destination = target / name
        if destination.exists():
            saved = backup / name
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(destination, saved)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(changes[name], encoding='utf-8')
    print('Backup:', backup)
    return changes


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('target', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    integrate(args.target, args.apply)
