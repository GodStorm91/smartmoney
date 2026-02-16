"""Add household_profile column to users table.

Revision ID: add_household_profile
Revises: add_user_theme_settings
Create Date: 2026-02-16 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


revision: str = "add_household_profile"
down_revision: Union[str, None] = "add_user_theme_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("household_profile", JSON, nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "household_profile")
