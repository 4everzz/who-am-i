"""Dependency-free policy regressions; no server, database, or emails are used."""
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / 'overlay/app/core/contact_security.py'
spec = importlib.util.spec_from_file_location('contact_security', path)
security = importlib.util.module_from_spec(spec)
spec.loader.exec_module(security)
SALT = 'local-test-only-contact-key-with-32-plus-characters'


class ContactSecurityTests(unittest.TestCase):
    def digest(self, peer, forwarded='', trusted=''):
        return security.contact_source_hash(peer, forwarded, trusted, SALT)

    def test_different_visitors_behind_trusted_docker_proxy_have_different_keys(self):
        first = self.digest('172.18.0.1', '203.0.113.1', '172.18.0.1')
        second = self.digest('172.18.0.1', '203.0.113.2', '172.18.0.1')
        self.assertNotEqual(first, second)
        self.assertEqual(len(first), 64)

    def test_missing_docker_trust_is_reported_instead_of_sharing_quota(self):
        with self.assertRaises(security.ContactConfigurationError):
            self.digest('172.18.0.1', '203.0.113.1', '127.0.0.1,::1')

    def test_production_internal_peer_without_forwarded_header_is_reported(self):
        with self.assertRaises(security.ContactConfigurationError):
            security.contact_source_hash('172.18.0.1', '', '', SALT, require_proxy=True)

    def test_untrusted_public_peer_cannot_change_key_using_forwarded_headers(self):
        self.assertEqual(self.digest('203.0.113.10'), self.digest('203.0.113.10', '203.0.113.11'))

    def test_trusted_proxy_needs_a_single_valid_ip(self):
        for forwarded in ('', 'garbage', '203.0.113.1,203.0.113.2', '203.0.113.1:8080'):
            with self.subTest(forwarded=forwarded), self.assertRaises(security.ContactConfigurationError):
                self.digest('127.0.0.1', forwarded, '127.0.0.1')

    def test_ip_spellings_and_ipv4_mapped_addresses_share_quota(self):
        self.assertEqual(self.digest('2001:db8::1'), self.digest('2001:0db8:0000::1'))
        self.assertEqual(self.digest('203.0.113.1'), self.digest('::ffff:203.0.113.1'))
        self.assertEqual(self.digest('127.0.0.1', '203.0.113.1', '127.0.0.1'),
                         self.digest('::ffff:127.0.0.1', '203.0.113.1', '127.0.0.1'))

    def test_empty_short_and_reused_jwt_keys_are_rejected(self):
        for salt, jwt in (('', ''), ('short', ''), (SALT, SALT)):
            with self.subTest(salt_length=len(salt)), self.assertRaises(security.ContactConfigurationError):
                security.check_salt(salt, jwt)

    def test_unknown_peer_and_wildcard_proxy_are_rejected(self):
        for peer, proxies in (('unknown', ''), ('127.0.0.1', '*'), ('127.0.0.1', '172.18.0.0/16')):
            with self.subTest(peer=peer), self.assertRaises(security.ContactConfigurationError):
                self.digest(peer, '203.0.113.1', proxies)

    def test_production_origins_exclude_development_and_non_origins(self):
        security.check_origins('https://zmeety.cn,https://www.zmeety.cn', production=True)
        security.check_origins('http://localhost:5173', production=False)
        for value in ('', 'http://localhost:5173', 'https://localhost', 'https://zmeety.cn/path',
                      'https://user:password@zmeety.cn', 'https://zmeety.cn?x=1', 'null'):
            with self.subTest(value=value), self.assertRaises(security.ContactConfigurationError):
                security.check_origins(value, production=True)


if __name__ == '__main__':
    unittest.main()
