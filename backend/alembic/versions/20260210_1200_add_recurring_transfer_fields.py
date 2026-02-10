"""Add transfer fields to recurring_transactions table

Revision ID: add_recurring_transfer
Revises: add_budget_versioning
Create Date: 2026-02-10 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_recurring_transfer"
down_revision: Union[str, None] = "add_budget_versioning"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recurring_transactions",
        sa.Column("is_transfer", sa.Boolean(), nullable=True, server_default="0"),
    )
    op.add_column(
        "recurring_transactions",
        sa.Column("to_account_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "recurring_transactions",
        sa.Column("transfer_fee_amount", sa.BigInteger(), nullable=True),
    )

    # Backfill is_transfer to False for existing rows, then make non-nullable
    op.execute("UPDATE recurring_transactions SET is_transfer = 0 WHERE is_transfer IS NULL")


def downgrade() -> None:
    op.drop_column("recurring_transactions", "transfer_fee_amount")
    op.drop_column("recurring_transactions", "to_account_id")
    op.drop_column("recurring_transactions", "is_transfer")
