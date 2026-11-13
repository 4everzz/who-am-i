"""Public submissions and owner-only message access; no visitor information is returned publicly."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select, text

from app.api.deps import DbSession, PlatformSuperAdmin
from app.core.config import settings
from app.core.contact_security import ContactConfigurationError, check_origins, contact_source_hash
from app.core.response import success
from app.models.contact_message import CONTACT_READ, ContactMessage
from app.schemas.contact_message import ContactMessageCreateRequest, ContactMessageListItem

router = APIRouter(tags=["个人站联系"])


def source_hash(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    production = str(getattr(settings, 'app_env', 'production')).lower() in {'prod', 'production'}
    try:
        return contact_source_hash(host, request.headers.get('x-real-ip', ''),
                                   settings.contact_trusted_proxies, settings.contact_rate_limit_salt,
                                   settings.jwt_secret, require_proxy=production)
    except ContactConfigurationError as error:
        logging.getLogger(__name__).error('Contact configuration: %s', error)
        raise HTTPException(503, '联系服务暂不可用，请通过页面邮箱联系') from error


@router.post('/contact-messages', status_code=202, summary='提交联系消息')
async def create_contact_message(payload: ContactMessageCreateRequest, request: Request, session: DbSession) -> dict:
    origin = request.headers.get('origin')
    production = str(getattr(settings, 'app_env', 'production')).lower() in {'prod', 'production'}
    try:
        check_origins(settings.contact_allowed_origins, production=production)
    except ContactConfigurationError as error:
        logging.getLogger(__name__).error('Contact configuration: %s', error)
        raise HTTPException(503, '联系服务暂不可用，请通过页面邮箱联系') from error
    allowed = {item.strip().rstrip('/') for item in settings.contact_allowed_origins.split(',') if item.strip()}
    if not origin and (production or getattr(settings, 'contact_require_origin', True)):
        raise HTTPException(403, '请从本站提交表单')
    if origin and origin.rstrip('/') not in allowed:
        raise HTTPException(403, '请从本站提交表单')
    if payload.website:
        return success({'id': str(payload.request_id)}, message='消息已收到')
    # Database counts and a short lock survive restarts and work across all app processes.
    hashed = source_hash(request)
    if session.get_bind(mapper=ContactMessage).dialect.name == 'postgresql':
        await session.execute(text('SELECT pg_advisory_xact_lock(20261111, 1)'))
    request_id = str(payload.request_id)
    existing = await session.scalar(select(ContactMessage).where(ContactMessage.request_id == request_id))
    if existing:
        if any(getattr(existing, key) != getattr(payload, key) for key in ('category', 'nickname', 'contact', 'content')):
            raise HTTPException(409, '请重新提交这条消息')
        return success({'id': request_id}, message='消息已收到')
    now = datetime.now(timezone.utc)
    recent = select(func.count()).select_from(ContactMessage).where(
        ContactMessage.created_at >= now - timedelta(seconds=settings.contact_rate_limit_window_seconds),
        ContactMessage.source_hash == hashed,
    )
    global_recent = select(func.count()).select_from(ContactMessage).where(
        ContactMessage.created_at >= now - timedelta(hours=1),
    )
    if (await session.scalar(recent)) >= settings.contact_rate_limit_max_submissions or (await session.scalar(global_recent)) >= settings.contact_hourly_limit:
        raise HTTPException(429, '提交较频繁，请稍后再试', headers={'Retry-After': '300'})
    session.add(ContactMessage(
        request_id=request_id, category=payload.category, nickname=payload.nickname,
        contact=payload.contact, content=payload.content, source_hash=hashed,
    ))
    await session.commit()
    return success({'id': request_id}, message='消息已收到')


@router.get('/admin/contact-messages', summary='仅站主查看联系消息')
async def list_contact_messages(
    _: PlatformSuperAdmin, session: DbSession,
    status: str | None = Query(default=None, pattern='^(unread|read)$'),
    limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0),
) -> dict:
    query = select(ContactMessage).order_by(ContactMessage.created_at.desc()).offset(offset).limit(limit)
    if status:
        query = query.where(ContactMessage.status == status)
    rows = (await session.execute(query)).scalars().all()
    return success({'items': [ContactMessageListItem.model_validate(row, from_attributes=True).model_dump() for row in rows]})


@router.post('/admin/contact-messages/{message_id}/read', summary='站主标记联系消息已读')
async def mark_contact_message_read(message_id: int, _: PlatformSuperAdmin, session: DbSession) -> dict:
    message = await session.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(404, '消息不存在')
    if message.read_at is None:
        message.status = CONTACT_READ
        message.read_at = datetime.now(timezone.utc)
        await session.commit()
    return success(message='消息已标记为已读')
