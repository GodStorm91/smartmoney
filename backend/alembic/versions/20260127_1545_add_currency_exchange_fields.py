"""Add linked_transaction_id and exchange_rate to transactions

Revision ID: add_currency_exchange
Revises: 03c9fb66edd6
Create Date: 2026-01-27 15:45:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_currency_exchange"
down_revision: Union[str, None] = "03c9fb66edd6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # For SQLite, we just add columns without FK constraint
    # The FK is enforced at the ORM level
    op.add_column(
        "transactions",
        sa.Column("linked_transaction_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_transactions_linked_transaction_id",
        "transactions",
        ["linked_transaction_id"],
    )

    # Add exchange_rate (Decimal for precision)
    op.add_column(
        "transactions",
        sa.Column("exchange_rate", sa.Numeric(18, 8), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transactions", "exchange_rate")
    op.drop_index("ix_transactions_linked_transaction_id", table_name="transactions")
    op.drop_column("transactions", "linked_transaction_id")
