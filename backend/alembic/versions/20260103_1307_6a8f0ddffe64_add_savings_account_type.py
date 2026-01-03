"""add_savings_account_type

Revision ID: 6a8f0ddffe64
Revises: add_tx_currency
Create Date: 2026-01-03 13:07:45.658962

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a8f0ddffe64'
down_revision: Union[str, None] = 'add_tx_currency'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # For SQLite, we use batch mode to modify constraints
    # This recreates the table with the new constraint
    with op.batch_alter_table('accounts', recreate='always') as batch_op:
        batch_op.drop_constraint('valid_account_type', type_='check')
        batch_op.create_check_constraint(
            'valid_account_type',
            "type IN ('bank', 'cash', 'credit_card', 'investment', 'receivable', 'crypto', 'savings', 'other')"
        )


def downgrade() -> None:
    with op.batch_alter_table('accounts', recreate='always') as batch_op:
        batch_op.drop_constraint('valid_account_type', type_='check')
        batch_op.create_check_constraint(
            'valid_account_type',
            "type IN ('bank', 'cash', 'credit_card', 'investment', 'receivable', 'crypto', 'other')"
        )
