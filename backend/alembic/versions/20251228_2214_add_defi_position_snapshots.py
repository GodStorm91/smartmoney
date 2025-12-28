"""add defi position snapshots table

Revision ID: add_defi_snapshots
Revises: add_crypto_wallet_tables
Create Date: 2025-12-28

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


revision: str = 'add_defi_snapshots'
down_revision: Union[str, None] = 'add_crypto_wallet_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not table_exists('defi_position_snapshots'):
        op.create_table(
            'defi_position_snapshots',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(42), nullable=False),
            sa.Column('position_id', sa.String(255), nullable=False),
            sa.Column('protocol', sa.String(100), nullable=False),
            sa.Column('chain_id', sa.String(20), nullable=False),
            sa.Column('position_type', sa.String(50), nullable=False),
            sa.Column('symbol', sa.String(50), nullable=False),
            sa.Column('token_name', sa.String(100), nullable=True),
            sa.Column('balance', sa.Numeric(36, 18), nullable=False),
            sa.Column('balance_usd', sa.Numeric(18, 2), nullable=False),
            sa.Column('price_usd', sa.Numeric(20, 8), nullable=True),
            sa.Column('protocol_apy', sa.Numeric(10, 4), nullable=True),
            sa.Column('snapshot_date', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_defi_snapshots_id', 'defi_position_snapshots', ['id'])
        op.create_index('ix_defi_snapshots_user_id', 'defi_position_snapshots', ['user_id'])
        op.create_index('ix_defi_snapshots_user_date', 'defi_position_snapshots', ['user_id', 'snapshot_date'])
        op.create_index('ix_defi_snapshots_position', 'defi_position_snapshots', ['position_id'])
        op.create_index('ix_defi_snapshots_unique', 'defi_position_snapshots',
                        ['user_id', 'position_id', 'snapshot_date'], unique=True)


def downgrade() -> None:
    if table_exists('defi_position_snapshots'):
        op.drop_index('ix_defi_snapshots_unique', table_name='defi_position_snapshots')
        op.drop_index('ix_defi_snapshots_position', table_name='defi_position_snapshots')
        op.drop_index('ix_defi_snapshots_user_date', table_name='defi_position_snapshots')
        op.drop_index('ix_defi_snapshots_user_id', table_name='defi_position_snapshots')
        op.drop_index('ix_defi_snapshots_id', table_name='defi_position_snapshots')
        op.drop_table('defi_position_snapshots')
