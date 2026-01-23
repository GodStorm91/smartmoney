"""add transfer fields to transactions

Revision ID: add_transfer_fields
Revises: a6d94e3c6dd7
Create Date: 2025-12-25 17:20:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_transfer_fields'
down_revision: Union[str, None] = 'a6d94e3c6dd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add transfer_id column (UUID string to link related transfer transactions)
    op.add_column('transactions', sa.Column('transfer_id', sa.String(36), nullable=True))

    # Add transfer_type column (outgoing, incoming, fee)
    op.add_column('transactions', sa.Column('transfer_type', sa.String(20), nullable=True))

    # Add index for efficient transfer lookups
    op.create_index('ix_transactions_transfer_id', 'transactions', ['transfer_id'])


def downgrade() -> None:
    op.drop_index('ix_transactions_transfer_id', table_name='transactions')
    op.drop_column('transactions', 'transfer_type')
    op.drop_column('transactions', 'transfer_id')
