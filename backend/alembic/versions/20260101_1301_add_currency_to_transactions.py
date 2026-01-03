"""add_currency_to_transactions

Revision ID: add_tx_currency
Revises: add_position_rewards
Create Date: 2026-01-01 13:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_tx_currency'
down_revision: Union[str, None] = 'add_position_rewards'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add currency column to transactions table with default value 'JPY'
    op.add_column('transactions', sa.Column('currency', sa.String(length=3), nullable=False, server_default='JPY'))

    # Update transactions to inherit currency from their linked account
    # This handles multi-currency accounts (VND, USD, etc.)
    # Using SQLite-compatible subquery syntax
    op.execute("""
        UPDATE transactions
        SET currency = (
            SELECT a.currency FROM accounts a WHERE a.id = transactions.account_id
        )
        WHERE account_id IN (
            SELECT id FROM accounts WHERE currency IS NOT NULL AND currency != 'JPY'
        )
    """)


def downgrade() -> None:
    op.drop_column('transactions', 'currency')
