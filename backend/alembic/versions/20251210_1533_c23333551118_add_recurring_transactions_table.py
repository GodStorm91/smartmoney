"""add_recurring_transactions_table

Revision ID: c23333551118
Revises: w42avxsi03tx
Create Date: 2025-12-10 15:33:44.439939

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c23333551118'
down_revision: Union[str, None] = 'w42avxsi03tx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'recurring_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('is_income', sa.Boolean(), default=False, nullable=False),

        # Frequency settings
        sa.Column('frequency', sa.String(20), nullable=False),  # weekly, monthly, yearly, custom
        sa.Column('interval_days', sa.Integer(), nullable=True),  # for custom: every N days
        sa.Column('day_of_week', sa.Integer(), nullable=True),  # 0-6 for weekly (0=Monday)
        sa.Column('day_of_month', sa.Integer(), nullable=True),  # 1-31 for monthly

        # Scheduling
        sa.Column('next_run_date', sa.Date(), nullable=False),
        sa.Column('last_run_date', sa.Date(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
    )

    # Create indexes
    op.create_index('ix_recurring_transactions_user_id', 'recurring_transactions', ['user_id'])
    op.create_index('ix_recurring_transactions_next_run_date', 'recurring_transactions', ['next_run_date'])
    op.create_index('ix_recurring_transactions_is_active', 'recurring_transactions', ['is_active'])


def downgrade() -> None:
    op.drop_index('ix_recurring_transactions_is_active', table_name='recurring_transactions')
    op.drop_index('ix_recurring_transactions_next_run_date', table_name='recurring_transactions')
    op.drop_index('ix_recurring_transactions_user_id', table_name='recurring_transactions')
    op.drop_table('recurring_transactions')
