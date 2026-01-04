"""Add transaction_id to position_rewards

Revision ID: 7e4844af5f77
Revises: add_large_tx_threshold
Create Date: 2026-01-04 23:16:54.851500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e4844af5f77'
down_revision: Union[str, None] = 'add_large_tx_threshold'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add transaction_id column to position_rewards
    # Using batch mode for SQLite compatibility
    with op.batch_alter_table('position_rewards', schema=None) as batch_op:
        batch_op.add_column(sa.Column('transaction_id', sa.Integer(), nullable=True))
        batch_op.create_index('ix_position_rewards_transaction_id', ['transaction_id'])
        batch_op.create_foreign_key(
            'fk_position_rewards_transaction_id',
            'transactions',
            ['transaction_id'], ['id'],
            ondelete='SET NULL'
        )


def downgrade() -> None:
    with op.batch_alter_table('position_rewards', schema=None) as batch_op:
        batch_op.drop_constraint('fk_position_rewards_transaction_id', type_='foreignkey')
        batch_op.drop_index('ix_position_rewards_transaction_id')
        batch_op.drop_column('transaction_id')
