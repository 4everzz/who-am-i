"""Installer upgrades use temporary source trees, never the live backend."""
from contextlib import redirect_stdout
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('contact_installer', Path(__file__).resolve().parents[1] / 'install.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def fixture(self, root, config):
        files = {
            'app/core/config.py': config,
            'app/models/__init__.py': '',
            'app/api/v1/router.py': '',
            'alembic/env.py': 'target_metadata = Base.metadata\n',
            'app/main.py': 'async def lifespan():\n    yield\n',
        }
        for name, text in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding='utf-8')

    def test_dry_run_does_not_change_sources(self):
        with tempfile.TemporaryDirectory() as temp, redirect_stdout(io.StringIO()):
            root = Path(temp) / 'backend'
            config = 'class Settings:\n    api_prefix: str = "/api/v1"\n'
            self.fixture(root, config)
            changes = installer.integrate(root)
            self.assertIn('contact_require_origin: bool = True', changes['app/core/config.py'])
            self.assertEqual((root / 'app/core/config.py').read_text(encoding='utf-8'), config)
            self.assertFalse((root / 'app/core/contact_security.py').exists())

    def test_existing_install_gains_missing_fields_without_overwriting_values(self):
        with tempfile.TemporaryDirectory() as temp, redirect_stdout(io.StringIO()):
            root = Path(temp) / 'backend'
            config = ('class Settings:\n    api_prefix: str = "/api/v1"\n'
                      '    contact_notification_enabled: bool = False\n'
                      '    contact_hourly_limit: int = 12\n'
                      '    contact_trusted_proxies: str = "172.18.0.1"\n')
            self.fixture(root, config)
            installer.integrate(root, apply=True)
            updated = (root / 'app/core/config.py').read_text(encoding='utf-8')
            self.assertIn('contact_require_origin: bool = True', updated)
            self.assertIn('contact_hourly_limit: int = 12', updated)
            self.assertIn('contact_trusted_proxies: str = "172.18.0.1"', updated)
            self.assertEqual(installer.integrate(root), {})


if __name__ == '__main__':
    unittest.main()
