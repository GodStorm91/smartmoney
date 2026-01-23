"""add position rewards and cost basis tables

Revision ID: add_position_rewards
Revises: add_defi_snapshots
Create Date: 2025-12-29

"""
from typing import Sequence, Union
from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


revision: str = 'add_position_rewards'
down_revision: Union[str, None] = 'add_defi_snapshots'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    # Position Rewards table
    if not table_exists('position_rewards'):
        op.create_table(
            'position_rewards',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('position_id', sa.String(255), nullable=True),
            sa.Column('wallet_address', sa.String(42), nullable=False),
            sa.Column('chain_id', sa.String(20), nullable=False),
            sa.Column('reward_token_address', sa.String(42), nullable=False),
            sa.Column('reward_token_symbol', sa.String(20), nullable=True),
            sa.Column('reward_amount', sa.Numeric(30, 18), nullable=False),
            sa.Column('reward_usd', sa.Numeric(18, 2), nullable=True),
            sa.Column('claimed_at', sa.DateTime(), nullable=False),
            sa.Column('tx_hash', sa.String(66), nullable=False),
            sa.Column('block_number', sa.BigInteger(), nullable=True),
            sa.Column('source', sa.String(20), nullable=False, server_default='merkl'),
            sa.Column('merkl_campaign_id', sa.String(100), nullable=True),
            sa.Column('is_attributed', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_position_rewards_id', 'position_rewards', ['id'])
        op.create_index('ix_position_rewards_user_id', 'position_rewards', ['user_id'])
        op.create_index('ix_position_rewards_position_id', 'position_rewards', ['position_id'])
        op.create_index('ix_position_rewards_tx_hash', 'position_rewards', ['tx_hash'], unique=True)

    # Position Cost Basis table
    if not table_exists('position_cost_basis'):
        op.create_table(
            'position_cost_basis',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('position_id', sa.String(255), nullable=False),
            sa.Column('wallet_address', sa.String(42), nullable=False),
            sa.Column('chain_id', sa.String(20), nullable=False),
            sa.Column('vault_address', sa.String(42), nullable=False),
            sa.Column('token_a_symbol', sa.String(20), nullable=True),
            sa.Column('token_a_amount', sa.Numeric(30, 18), nullable=True),
            sa.Column('token_b_symbol', sa.String(20), nullable=True),
            sa.Column('token_b_amount', sa.Numeric(30, 18), nullable=True),
            sa.Column('total_usd', sa.Numeric(18, 2), nullable=False),
            sa.Column('deposited_at', sa.DateTime(), nullable=False),
            sa.Column('tx_hash', sa.String(66), nullable=False),
            sa.Column('block_number', sa.BigInteger(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_position_cost_basis_id', 'position_cost_basis', ['id'])
        op.create_index('ix_position_cost_basis_user_id', 'position_cost_basis', ['user_id'])
        op.create_index('ix_position_cost_basis_position', 'position_cost_basis', ['position_id'])


def downgrade() -> None:
    if table_exists('position_cost_basis'):
        op.drop_table('position_cost_basis')
    if table_exists('position_rewards'):
        op.drop_table('position_rewards')
