"""Add version tracking to budgets table

Revision ID: add_budget_versioning
Revises: add_currency_exchange
Create Date: 2026-02-01 08:35:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_budget_versioning"
down_revision: Union[str, None] = "add_currency_exchange"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add version tracking columns
    op.add_column(
        "budgets",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "budgets",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "budgets",
        sa.Column("copied_from_id", sa.Integer(), nullable=True),
    )

    # Add foreign key for copied_from_id (self-referential)
    op.create_foreign_key(
        "fk_budget_copied_from",
        "budgets",
        "budgets",
        ["copied_from_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create index for copied_from_id
    op.create_index(
        "ix_budgets_copied_from_id",
        "budgets",
        ["copied_from_id"],
    )

    # Create index for is_active
    op.create_index(
        "ix_budgets_is_active",
        "budgets",
        ["is_active"],
    )

    # Drop the old unique constraint
    op.drop_index("ix_budget_user_month_unique", table_name="budgets")

    # Create new partial unique index (only active budgets must be unique per user/month)
    # PostgreSQL-specific syntax for partial index
    op.execute(
        """
        CREATE UNIQUE INDEX ix_budget_user_month_active
        ON budgets (user_id, month)
        WHERE is_active = true
        """
    )

    # Create regular index for querying all budgets by user/month
    op.create_index(
        "ix_budget_user_month",
        "budgets",
        ["user_id", "month"],
    )


def downgrade() -> None:
    # Drop new indexes
    op.drop_index("ix_budget_user_month", table_name="budgets")
    op.drop_index("ix_budget_user_month_active", table_name="budgets")
    op.drop_index("ix_budgets_is_active", table_name="budgets")
    op.drop_index("ix_budgets_copied_from_id", table_name="budgets")

    # Drop foreign key
    op.drop_constraint("fk_budget_copied_from", "budgets", type_="foreignkey")

    # Drop columns
    op.drop_column("budgets", "copied_from_id")
    op.drop_column("budgets", "is_active")
    op.drop_column("budgets", "version")

    # Recreate original unique index
    op.create_index(
        "ix_budget_user_month_unique",
        "budgets",
        ["user_id", "month"],
        unique=True,
    )
