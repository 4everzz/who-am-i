"""add contact notification delivery status"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "c7d8e9f0a1b2"
down_revision: str | None = "f9a0b1c2d3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contact_messages",
        sa.Column("notification_status", sa.String(length=16), server_default="pending", nullable=False),
    )
    op.execute(
        "UPDATE contact_messages SET notification_status = 'sent' "
        "WHERE notification_sent_at IS NOT NULL"
    )
    op.create_check_constraint(
        "ck_contact_notification_status",
        "contact_messages",
        "notification_status IN ('pending', 'sent', 'manual')",
    )
    op.create_index(
        "ix_contact_messages_notification_status",
        "contact_messages",
        ["notification_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_contact_messages_notification_status", table_name="contact_messages")
    op.drop_constraint("ck_contact_notification_status", "contact_messages", type_="check")
    op.drop_column("contact_messages", "notification_status")
