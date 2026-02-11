"""Add report_ai_summaries table for cached AI report summaries.

Revision ID: add_report_ai_summaries
Revises: normalize_alloc_categories
Create Date: 2026-02-11 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_report_ai_summaries"
down_revision: Union[str, None] = "normalize_alloc_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_ai_summaries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(5), nullable=False, server_default="ja"),
        sa.Column("win", sa.Text(), nullable=False),
        sa.Column("warning", sa.Text(), nullable=False),
        sa.Column("trend", sa.Text(), nullable=False),
        sa.Column("credits_used", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(),
                  nullable=False),
        sa.UniqueConstraint("user_id", "year", "month", "language",
                            name="uq_report_ai_summary"),
    )


def downgrade() -> None:
    op.drop_table("report_ai_summaries")
