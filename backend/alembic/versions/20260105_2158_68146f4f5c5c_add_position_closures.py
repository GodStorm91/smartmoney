"""add_position_closures

Revision ID: 68146f4f5c5c
Revises: 7e4844af5f77
Create Date: 2026-01-05 21:58:37.520351

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '68146f4f5c5c'
down_revision: Union[str, None] = '7e4844af5f77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create position_closures table for tracking closed LP positions."""
    op.create_table('position_closures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('position_id', sa.String(length=255), nullable=False),
        sa.Column('wallet_address', sa.String(length=42), nullable=False),
        sa.Column('chain_id', sa.String(length=20), nullable=False),
        sa.Column('protocol', sa.String(length=100), nullable=False),
        sa.Column('symbol', sa.String(length=100), nullable=False),
        sa.Column('exit_date', sa.DateTime(), nullable=False),
        sa.Column('exit_value_usd', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('exit_value_jpy', sa.BigInteger(), nullable=False),
        sa.Column('exit_tx_hash', sa.String(length=66), nullable=True),
        sa.Column('note', sa.String(length=255), nullable=True),
        sa.Column('cost_basis_usd', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('total_rewards_usd', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('realized_pnl_usd', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('realized_pnl_jpy', sa.BigInteger(), nullable=True),
        sa.Column('transaction_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_position_closures_id'), 'position_closures', ['id'], unique=False)
    op.create_index(op.f('ix_position_closures_position_id'), 'position_closures', ['position_id'], unique=False)
    op.create_index(op.f('ix_position_closures_user_id'), 'position_closures', ['user_id'], unique=False)
    op.create_index('ix_position_closures_user_position', 'position_closures', ['user_id', 'position_id'], unique=False)


def downgrade() -> None:
    """Drop position_closures table."""
    op.drop_index('ix_position_closures_user_position', table_name='position_closures')
    op.drop_index(op.f('ix_position_closures_user_id'), table_name='position_closures')
    op.drop_index(op.f('ix_position_closures_position_id'), table_name='position_closures')
    op.drop_index(op.f('ix_position_closures_id'), table_name='position_closures')
    op.drop_table('position_closures')
