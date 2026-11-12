"""Persistent contact email outbox, independent of the visitor's HTTP request."""

import asyncio
import logging
import smtplib
import ssl
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.contact_message import ContactMessage

logger = logging.getLogger(__name__)


def _send_email_sync(message) -> None:
    category = '合作' if message.category == 'cooperation' else '建议'
    mail = EmailMessage()
    mail['Subject'] = f'[zmeety.cn][{category}] 新联系消息'
    mail['From'] = settings.smtp_from or settings.smtp_username
    mail['To'] = settings.contact_notification_to
    if '@' in message.contact:
        mail['Reply-To'] = message.contact
    mail.set_content(
        f'类型：{category}\n昵称：{message.nickname}\n联系方式：{message.contact}\n'
        f'时间：{message.created_at.isoformat()}\n\n{message.content}\n'
    )
    context = ssl.create_default_context()
    if settings.smtp_use_ssl:
        client = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10, context=context)
    else:
        client = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
    with client:
        if not settings.smtp_use_ssl:
            client.starttls(context=context)
        client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(mail)


async def deliver_pending_once() -> bool:
    async with AsyncSessionLocal() as session:
        now = datetime.now(timezone.utc)
        message = await session.scalar(
            select(ContactMessage).where(
                ContactMessage.notification_sent_at.is_(None),
                ContactMessage.notification_next_attempt_at <= now,
            ).order_by(ContactMessage.notification_next_attempt_at, ContactMessage.id)
            .limit(1).with_for_update(skip_locked=True)
        )
        if message is None:
            return False
        message.notification_attempts += 1
        try:
            await asyncio.to_thread(_send_email_sync, message)
        except Exception as error:
            message.notification_error = type(error).__name__
            delay = min(3600, 30 * 2 ** min(message.notification_attempts, 7))
            message.notification_next_attempt_at = now + timedelta(seconds=delay)
            logger.warning('Contact email failed id=%s type=%s', message.id, type(error).__name__)
        else:
            message.notification_sent_at = datetime.now(timezone.utc)
            message.notification_error = None
        await session.commit()
        return True


async def _worker():
    while True:
        try:
            if await deliver_pending_once():
                continue
        except Exception as error:
            logger.warning('Contact outbox unavailable type=%s', type(error).__name__)
        await asyncio.sleep(10)


@asynccontextmanager
async def contact_notification_lifespan():
    task = None
    if settings.contact_notification_enabled:
        required = (settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.contact_notification_to)
        if not all(required):
            logger.error('Contact email enabled but configuration is incomplete; messages remain pending')
        else:
            task = asyncio.create_task(_worker())
    try:
        yield
    finally:
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
