"""add holdings and holding_lots tables

Revision ID: 9bc23e073d14
Revises: 09bc2d60a1dd
Create Date: 2026-03-03 12:49:18.759692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9bc23e073d14'
down_revision: Union[str, None] = '09bc2d60a1dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('holdings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('asset_name', sa.String(length=200), nullable=False),
        sa.Column('asset_type', sa.String(length=50), nullable=False),
        sa.Column('ticker', sa.String(length=20), nullable=True),
        sa.Column('unit_label', sa.String(length=20), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('total_units', sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column('total_cost_basis', sa.BigInteger(), nullable=False),
        sa.Column('current_price_per_unit', sa.BigInteger(), nullable=True),
        sa.Column('current_price_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_holdings_asset_type', 'holdings', ['asset_type'], unique=False)
    op.create_index('ix_holdings_id', 'holdings', ['id'], unique=False)
    op.create_index('ix_holdings_is_active', 'holdings', ['is_active'], unique=False)
    op.create_index('ix_holdings_user_active', 'holdings', ['user_id', 'is_active'], unique=False)
    op.create_index('ix_holdings_user_id', 'holdings', ['user_id'], unique=False)

    op.create_table('holding_lots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('holding_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('units', sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column('price_per_unit', sa.BigInteger(), nullable=False),
        sa.Column('total_amount', sa.BigInteger(), nullable=False),
        sa.Column('fee_amount', sa.BigInteger(), nullable=True),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['holding_id'], ['holdings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_holding_lots_holding_id', 'holding_lots', ['holding_id'], unique=False)
    op.create_index('ix_holding_lots_id', 'holding_lots', ['id'], unique=False)
    op.create_index('ix_holding_lots_user_id', 'holding_lots', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_holding_lots_user_id', table_name='holding_lots')
    op.drop_index('ix_holding_lots_id', table_name='holding_lots')
    op.drop_index('ix_holding_lots_holding_id', table_name='holding_lots')
    op.drop_table('holding_lots')
    op.drop_index('ix_holdings_user_id', table_name='holdings')
    op.drop_index('ix_holdings_user_active', table_name='holdings')
    op.drop_index('ix_holdings_is_active', table_name='holdings')
    op.drop_index('ix_holdings_id', table_name='holdings')
    op.drop_index('ix_holdings_asset_type', table_name='holdings')
    op.drop_table('holdings')
