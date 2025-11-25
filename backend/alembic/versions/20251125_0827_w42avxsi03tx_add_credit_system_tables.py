"""add_credit_system_tables

Revision ID: w42avxsi03tx
Revises: 38af909718d3
Create Date: 2025-11-25 08:27:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'w42avxsi03tx'
down_revision: Union[str, None] = '38af909718d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_credits table
    op.create_table(
        'user_credits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.Numeric(precision=10, scale=4), nullable=False, server_default='0.0000'),
        sa.Column('lifetime_purchased', sa.Numeric(precision=10, scale=4), nullable=False, server_default='0.0000'),
        sa.Column('lifetime_spent', sa.Numeric(precision=10, scale=4), nullable=False, server_default='0.0000'),
        sa.Column('last_purchase_date', sa.DateTime(), nullable=True),
        sa.Column('last_transaction_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint('balance >= 0', name='balance_non_negative'),
        sa.CheckConstraint('lifetime_purchased >= 0', name='lifetime_purchased_non_negative'),
        sa.CheckConstraint('lifetime_spent >= 0', name='lifetime_spent_non_negative'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_user_credits_id', 'user_credits', ['id'], unique=False)
    op.create_index('ix_user_credits_user_id', 'user_credits', ['user_id'], unique=False)
    # Conditional index for PostgreSQL (balance > 0)
    # SQLite doesn't support partial indexes, so we skip it
    try:
        op.create_index(
            'ix_user_credits_balance',
            'user_credits',
            ['balance'],
            postgresql_where=sa.text('balance > 0')
        )
    except Exception:
        pass  # Skip for SQLite

    # Create credit_purchases table
    op.create_table(
        'credit_purchases',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('package', sa.String(length=20), nullable=False),
        sa.Column('amount_vnd', sa.Integer(), nullable=False),
        sa.Column('credits', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('payment_method', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('sepay_transaction_id', sa.String(length=100), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint("package IN ('starter', 'basic', 'standard', 'premium')", name='valid_package'),
        sa.CheckConstraint("status IN ('pending', 'completed', 'failed', 'expired')", name='valid_status'),
        sa.CheckConstraint('amount_vnd > 0', name='amount_positive'),
        sa.CheckConstraint('credits > 0', name='credits_positive'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_credit_purchases_user_id', 'credit_purchases', ['user_id'], unique=False)
    op.create_index('ix_credit_purchases_status', 'credit_purchases', ['status'], unique=False)
    op.create_index('ix_credit_purchases_sepay_txn', 'credit_purchases', ['sepay_transaction_id'], unique=False)
    op.create_index('ix_credit_purchases_created_at', 'credit_purchases', ['created_at'], unique=False)

    # Create credit_transactions table
    op.create_table(
        'credit_transactions',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('balance_after', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),  # JSON for SQLite, JSONB for PostgreSQL
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint("type IN ('purchase', 'usage', 'refund', 'adjustment')", name='valid_type'),
        sa.CheckConstraint('amount != 0', name='amount_not_zero'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_credit_transactions_user_id', 'credit_transactions', ['user_id'], unique=False)
    op.create_index('ix_credit_transactions_type', 'credit_transactions', ['type'], unique=False)
    op.create_index('ix_credit_transactions_created_at', 'credit_transactions', ['created_at'], unique=False)
    op.create_index('ix_credit_transactions_reference_id', 'credit_transactions', ['reference_id'], unique=False)
    # GIN index for JSONB extra_data (PostgreSQL only)
    try:
        op.create_index(
            'ix_credit_transactions_extra_data',
            'credit_transactions',
            ['extra_data'],
            postgresql_using='gin'
        )
    except Exception:
        pass  # Skip for SQLite


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index('ix_credit_transactions_reference_id', table_name='credit_transactions')
    op.drop_index('ix_credit_transactions_created_at', table_name='credit_transactions')
    op.drop_index('ix_credit_transactions_type', table_name='credit_transactions')
    op.drop_index('ix_credit_transactions_user_id', table_name='credit_transactions')
    try:
        op.drop_index('ix_credit_transactions_extra_data', table_name='credit_transactions')
    except Exception:
        pass
    op.drop_table('credit_transactions')

    op.drop_index('ix_credit_purchases_created_at', table_name='credit_purchases')
    op.drop_index('ix_credit_purchases_sepay_txn', table_name='credit_purchases')
    op.drop_index('ix_credit_purchases_status', table_name='credit_purchases')
    op.drop_index('ix_credit_purchases_user_id', table_name='credit_purchases')
    op.drop_table('credit_purchases')

    op.drop_index('ix_user_credits_user_id', table_name='user_credits')
    op.drop_index('ix_user_credits_id', table_name='user_credits')
    try:
        op.drop_index('ix_user_credits_balance', table_name='user_credits')
    except Exception:
        pass
    op.drop_table('user_credits')
