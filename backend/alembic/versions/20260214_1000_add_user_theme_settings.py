"""Add theme_settings column to users table.

Revision ID: add_user_theme_settings
Revises: add_report_ai_summaries
Create Date: 2026-02-14 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


revision: str = "add_user_theme_settings"
down_revision: Union[str, None] = "add_report_ai_summaries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("theme_settings", JSON, nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "theme_settings")
