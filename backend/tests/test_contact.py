"""Run with PYTHONPATH pointing at a staged family-menu backend, never production."""
import asyncio
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

os.environ.setdefault('DATABASE_URL', 'postgresql+psycopg://test:test@127.0.0.1/unused')
os.environ.setdefault('JWT_SECRET', 'local-contact-test-key-not-for-production-123456')
os.environ.setdefault('APP_ENV', 'dev')

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api import deps
from app.api.v1 import contact_messages as routes
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import register_exception_handlers
from app.models.contact_message import ContactMessage
from app.models.user import User
from app.services import contact_message_service as delivery


def payload(**changes):
    value = dict(request_id=str(uuid4()), category='cooperation', nickname='Visitor',
                 contact='visitor@example.com', content='Discuss an opportunity.', website='')
    value.update(changes)
    return value


@pytest_asyncio.fixture
async def env(tmp_path, monkeypatch):
    engine = create_async_engine('sqlite+aiosqlite:///' + str(tmp_path / 'messages.sqlite'))
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(ContactMessage.__table__.create)

    async def session_override():
        async with factory() as session:
            yield session
    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(routes.router, prefix='/api/v1')
    app.dependency_overrides[get_db] = session_override
    monkeypatch.setattr(delivery, 'AsyncSessionLocal', factory)
    monkeypatch.setattr(settings, 'contact_rate_limit_max_submissions', 3)
    monkeypatch.setattr(settings, 'contact_hourly_limit', 60)
    monkeypatch.setattr(settings, 'contact_rate_limit_salt', 'test-contact-rate-limit-salt-at-least-32-characters')
    monkeypatch.setattr(settings, 'contact_require_origin', True)
    monkeypatch.setattr(settings, 'contact_trusted_proxies', '')
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app, client=('203.0.113.10', 12345)),
                              base_url='http://localhost', headers={'Origin': 'https://zmeety.cn'})
    yield app, client, factory
    await client.aclose()
    await engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize('category', ['cooperation', 'suggestion'])
async def test_save_and_keep_personal_details_private(env, category):
    _, client, factory = env
    value = payload(category=category)
    response = await client.post('/api/v1/contact-messages', json=value)
    assert response.status_code == 202
    assert response.json()['data'] == {'id': value['request_id']}
    assert value['contact'] not in response.text
    async with factory() as session:
        row = await session.scalar(select(ContactMessage))
        assert row.contact == value['contact']
        assert row.status == 'unread' and row.notification_sent_at is None
        assert len(row.source_hash) == 64


@pytest.mark.asyncio
@pytest.mark.parametrize('changes', [
    {'category': 'other'}, {'nickname': '   '}, {'nickname': 'x' * 81},
    {'contact': 'wrong'}, {'contact': 'x\r\nBCC:evil@example.com'},
    {'contact': '123'}, {'content': '   '}, {'content': 'x' * 4001},
    {'content': 'test\x00test'}, {'request_id': 'invalid'}, {'unexpected': 'extra'},
])
async def test_validation_rejects_without_write(env, changes):
    _, client, factory = env
    response = await client.post('/api/v1/contact-messages', json=payload(**changes))
    assert response.status_code == 422
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(ContactMessage)) == 0


@pytest.mark.asyncio
async def test_trim_and_phone(env):
    _, client, factory = env
    response = await client.post('/api/v1/contact-messages', json=payload(nickname=' Visitor ', contact='+86 138-0013-8000'))
    assert response.status_code == 202
    async with factory() as session:
        assert (await session.scalar(select(ContactMessage))).nickname == 'Visitor'


@pytest.mark.asyncio
async def test_retry_is_idempotent_and_conflict_is_rejected(env):
    _, client, factory = env
    data = payload()
    for _ in range(5):
        assert (await client.post('/api/v1/contact-messages', json=data)).status_code == 202
    assert (await client.post('/api/v1/contact-messages', json={**data, 'content': 'different'})).status_code == 409
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(ContactMessage)) == 1


@pytest.mark.asyncio
async def test_origin_spam_and_private_list(env):
    _, client, factory = env
    assert (await client.post('/api/v1/contact-messages', headers={'Origin': 'https://evil.example'}, json=payload())).status_code == 403
    assert (await client.post('/api/v1/contact-messages', json=payload(website='spam.example'))).status_code == 202
    assert (await client.get('/api/v1/admin/contact-messages')).status_code == 401
    assert (await client.get('/api/v1/contact-messages')).status_code == 405
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(ContactMessage)) == 0


@pytest.mark.asyncio
async def test_spoofed_proxy_header_cannot_bypass_persistent_limit(env):
    _, client, _ = env
    for i in range(3):
        assert (await client.post('/api/v1/contact-messages', headers={'X-Real-IP': f'10.0.0.{i}'}, json=payload())).status_code == 202
    assert (await client.post('/api/v1/contact-messages', headers={'X-Real-IP': '10.1.2.3'}, json=payload())).status_code == 429


@pytest.mark.asyncio
async def test_global_limit(env, monkeypatch):
    _, client, _ = env
    monkeypatch.setattr(settings, 'contact_trusted_proxies', '203.0.113.10')
    monkeypatch.setattr(settings, 'contact_hourly_limit', 2)
    for i in range(2):
        assert (await client.post('/api/v1/contact-messages', headers={'X-Real-IP': f'10.1.2.{i}'}, json=payload())).status_code == 202
    assert (await client.post('/api/v1/contact-messages', headers={'X-Real-IP': '10.3.2.1'}, json=payload())).status_code == 429


@pytest.mark.asyncio
async def test_missing_origin_is_rejected_without_write(env):
    _, client, factory = env
    del client.headers['Origin']
    assert (await client.post('/api/v1/contact-messages', json=payload())).status_code == 403
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(ContactMessage)) == 0


@pytest.mark.asyncio
async def test_missing_contact_secret_fails_only_contact_submission(env, monkeypatch):
    _, client, factory = env
    monkeypatch.setattr(settings, 'contact_rate_limit_salt', '')
    monkeypatch.setattr(settings, 'contact_notification_enabled', False)
    async with delivery.contact_notification_lifespan():
        response = await client.post('/api/v1/contact-messages', json=payload())
        assert response.status_code == 503
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(ContactMessage)) == 0


@pytest.mark.asyncio
async def test_proxy_visitors_have_independent_quotas(env, monkeypatch):
    _, client, factory = env
    monkeypatch.setattr(settings, 'contact_trusted_proxies', '203.0.113.10')
    for visitor in ('203.0.113.20', '203.0.113.21'):
        for _ in range(3):
            assert (await client.post('/api/v1/contact-messages', headers={'X-Real-IP': visitor}, json=payload())).status_code == 202
        assert (await client.post('/api/v1/contact-messages', headers={'X-Real-IP': visitor}, json=payload())).status_code == 429
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(ContactMessage)) == 6


@pytest.mark.asyncio
async def test_session_with_mapper_bind_supports_submissions(env):
    app, client, factory = env
    bound_factory = async_sessionmaker(binds={ContactMessage: factory.kw['bind']}, expire_on_commit=False)
    async def bound_session():
        async with bound_factory() as session:
            assert session.bind is None
            yield session
    app.dependency_overrides[get_db] = bound_session
    assert (await client.post('/api/v1/contact-messages', json=payload())).status_code == 202


@pytest.mark.asyncio
@pytest.mark.parametrize('role', ['viewer', 'operator'])
async def test_non_owner_cannot_read_messages(env, role):
    app, client, _ = env
    async def user():
        return User(id=10, username='someone', platform_role=role, is_platform_admin=False)
    app.dependency_overrides[deps.get_current_user] = user
    assert (await client.get('/api/v1/admin/contact-messages')).status_code == 403
    assert (await client.post('/api/v1/admin/contact-messages/1/read')).status_code == 403


@pytest.mark.asyncio
async def test_owner_can_read_and_mark(env):
    app, client, _ = env
    await client.post('/api/v1/contact-messages', json=payload())
    async def owner():
        return User(id=1, username='owner', is_platform_admin=True)
    app.dependency_overrides[deps.get_current_user] = owner
    response = await client.get('/api/v1/admin/contact-messages')
    assert response.status_code == 200
    message_id = response.json()['data']['items'][0]['id']
    assert (await client.post(f'/api/v1/admin/contact-messages/{message_id}/read')).status_code == 200
    assert (await client.get('/api/v1/admin/contact-messages?status=unread')).json()['data']['items'] == []


@pytest.mark.asyncio
async def test_failed_mail_is_persisted_then_retried(env, monkeypatch):
    _, client, factory = env
    await client.post('/api/v1/contact-messages', json=payload())
    def fail(_):
        raise RuntimeError('secret details must not be stored or logged')
    monkeypatch.setattr(delivery, '_send_email_sync', fail)
    assert await delivery.deliver_pending_once()
    async with factory() as session:
        row = await session.scalar(select(ContactMessage))
        assert row.notification_sent_at is None
        assert row.notification_attempts == 1 and row.notification_error == 'RuntimeError'
        row.notification_next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await session.commit()
    sent = []
    monkeypatch.setattr(delivery, '_send_email_sync', lambda message: sent.append(message.id))
    assert await delivery.deliver_pending_once()
    assert not await delivery.deliver_pending_once()
    async with factory() as session:
        row = await session.scalar(select(ContactMessage))
        assert row.notification_sent_at is not None and row.notification_error is None
        assert row.notification_attempts == 2
    assert len(sent) == 1


@pytest.mark.asyncio
async def test_submit_does_not_wait_for_smtp(env, monkeypatch):
    _, client, _ = env
    def should_not_run(_):
        pytest.fail('SMTP should run in the outbox worker, never in the HTTP request')
    monkeypatch.setattr(delivery, '_send_email_sync', should_not_run)
    assert (await client.post('/api/v1/contact-messages', json=payload())).status_code == 202
