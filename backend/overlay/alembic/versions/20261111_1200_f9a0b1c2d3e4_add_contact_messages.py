"""add public contact messages"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "f9a0b1c2d3e4"
down_revision: str | None = "e8f9a0b1c2d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contact_messages",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("request_id", sa.String(length=36), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("nickname", sa.String(length=80), nullable=False),
        sa.Column("contact", sa.String(length=160), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), server_default="unread", nullable=False),
        sa.Column("source_hash", sa.String(length=64), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notification_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notification_error", sa.String(length=500), nullable=True),
        sa.Column("notification_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("notification_next_attempt_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("request_id", name="uq_contact_messages_request_id"),
        sa.CheckConstraint("category IN ('cooperation', 'suggestion')", name="ck_contact_category"),
        sa.CheckConstraint("status IN ('unread', 'read')", name="ck_contact_status"),
    )
    op.create_index("ix_contact_messages_category", "contact_messages", ["category"], unique=False)
    op.create_index("ix_contact_messages_status", "contact_messages", ["status"], unique=False)
    op.create_index("ix_contact_messages_notification_next_attempt_at", "contact_messages", ["notification_next_attempt_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_contact_messages_notification_next_attempt_at", table_name="contact_messages")
    op.drop_index("ix_contact_messages_status", table_name="contact_messages")
    op.drop_index("ix_contact_messages_category", table_name="contact_messages")
    op.drop_table("contact_messages")
