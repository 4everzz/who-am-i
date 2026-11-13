"""Contact-specific proxy and configuration checks without database dependencies."""
import hashlib
import hmac
from ipaddress import ip_address, ip_network
from urllib.parse import urlsplit


class ContactConfigurationError(ValueError):
    pass


_INTERNAL_NETWORKS = tuple(ip_network(value) for value in (
    '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7',
))


def _address(value):
    parsed = ip_address(value.strip())
    return getattr(parsed, 'ipv4_mapped', None) or parsed


def trusted_proxy_addresses(value):
    try:
        return {_address(item) for item in value.split(',') if item.strip()}
    except ValueError as error:
        raise ContactConfigurationError('CONTACT_TRUSTED_PROXIES must list exact proxy IP addresses') from error


def check_salt(salt, jwt_secret=''):
    if len(salt.strip()) < 32 or salt.strip() == jwt_secret.strip():
        raise ContactConfigurationError('CONTACT_RATE_LIMIT_SALT requires an independent secret of at least 32 characters')


def check_origins(value, production=False):
    origins = {item.strip() for item in value.split(',') if item.strip()}
    if not origins:
        raise ContactConfigurationError('CONTACT_ALLOWED_ORIGINS is empty')
    for origin in origins:
        try:
            url = urlsplit(origin)
            url.port  # Validate malformed ports too.
        except ValueError as error:
            raise ContactConfigurationError('CONTACT_ALLOWED_ORIGINS contains a malformed origin') from error
        if (url.scheme not in {'http', 'https'} or not url.hostname or url.username or url.password
                or url.path not in {'', '/'} or url.query or url.fragment):
            raise ContactConfigurationError('CONTACT_ALLOWED_ORIGINS must contain HTTP(S) origins only')
        if production and (url.scheme != 'https' or url.hostname in {'localhost', '127.0.0.1', '::1'}):
            raise ContactConfigurationError('Production contact origins must use HTTPS and exclude localhost')


def contact_source_hash(peer, forwarded, trusted_proxies, salt, jwt_secret='', require_proxy=False):
    check_salt(salt, jwt_secret)
    trusted = trusted_proxy_addresses(trusted_proxies)
    try:
        source = _address(peer)
    except ValueError as error:
        raise ContactConfigurationError('Contact client address is unavailable') from error
    if source in trusted:
        try:
            source = _address(forwarded)
        except ValueError as error:
            raise ContactConfigurationError('Trusted contact proxy must overwrite X-Real-IP with one valid IP') from error
    elif (forwarded or require_proxy) and (source.is_loopback or source.is_link_local or any(source in net for net in _INTERNAL_NETWORKS)):
        # Fail visibly rather than silently applying one visitor quota to a Docker gateway.
        raise ContactConfigurationError('Internal contact proxy is untrusted; verify CONTACT_TRUSTED_PROXIES')
    # Headers from a public untrusted peer never control the rate-limit key.
    return hmac.new(salt.strip().encode(), str(source).encode(), hashlib.sha256).hexdigest()
