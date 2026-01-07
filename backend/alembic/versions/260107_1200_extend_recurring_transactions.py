"""extend_recurring_transactions

Revision ID: 2601071200
Revises: 20260107_dismissed
Create Date: 2026-01-07 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2601071200'
down_revision: Union[str, None] = '20260107_dismissed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add currency and source fields
    op.add_column('recurring_transactions', sa.Column('currency', sa.String(3), nullable=False, server_default='JPY'))
    op.add_column('recurring_transactions', sa.Column('source', sa.String(100), nullable=False, server_default='Manual'))

    # Add monthly/yearly specific fields
    op.add_column('recurring_transactions', sa.Column('month_of_year', sa.Integer(), nullable=True))
    op.add_column('recurring_transactions', sa.Column('start_date', sa.Date(), nullable=False, server_default=sa.func.current_date()))

    # Add end_date and auto_submit
    op.add_column('recurring_transactions', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('recurring_transactions', sa.Column('auto_submit', sa.Boolean(), nullable=False, server_default='false'))

    # Update frequency enum to include 'daily' and 'biweekly'
    op.execute("ALTER TYPE recurrencetransactionfrequency ADD VALUE IF NOT EXISTS 'daily'")
    op.execute("ALTER TYPE recurrencetransactionfrequency ADD VALUE IF NOT EXISTS 'biweekly'")


def downgrade() -> None:
    op.drop_column('recurring_transactions', 'auto_submit')
    op.drop_column('recurring_transactions', 'end_date')
    op.drop_column('recurring_transactions', 'start_date')
    op.drop_column('recurring_transactions', 'month_of_year')
    op.drop_column('recurring_transactions', 'source')
    op.drop_column('recurring_transactions', 'currency')
