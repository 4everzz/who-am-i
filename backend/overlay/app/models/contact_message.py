"""公开个人站联系表单消息。"""

from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


CONTACT_COOPERATION = "cooperation"
CONTACT_SUGGESTION = "suggestion"
CONTACT_UNREAD = "unread"
CONTACT_READ = "read"


class ContactMessage(Base, TimestampMixin):
    """来自 zmeety.cn 的公开联系消息。"""

    __tablename__ = "contact_messages"
    __table_args__ = (
        CheckConstraint("category IN ('cooperation', 'suggestion')", name="ck_contact_category"),
        CheckConstraint("status IN ('unread', 'read')", name="ck_contact_status"),
    )

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True, comment="联系类型")
    nickname: Mapped[str] = mapped_column(String(80), nullable=False, comment="访客昵称")
    contact: Mapped[str] = mapped_column(String(160), nullable=False, comment="访客联系方式")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="联系内容")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=CONTACT_UNREAD, server_default=CONTACT_UNREAD, index=True, comment="unread / read")
    source_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, comment="脱敏后的来源标识")
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notification_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notification_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notification_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    notification_next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
