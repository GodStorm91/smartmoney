"""add_exchange_rates_and_base_currency

Revision ID: cd12f1e07ac8
Revises: 2347c23824af
Create Date: 2025-11-19 10:30:59.906602

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd12f1e07ac8'
down_revision: Union[str, None] = '2347c23824af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create exchange_rates table
    op.create_table(
        'exchange_rates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('rate_to_jpy', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.CheckConstraint('rate_to_jpy > 0', name='positive_rate'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('currency')
    )
    op.create_index(op.f('ix_exchange_rates_currency'), 'exchange_rates', ['currency'], unique=True)

    # Add base_currency column to app_settings
    op.add_column('app_settings', sa.Column('base_currency', sa.String(length=3), nullable=False, server_default='JPY'))

    # Seed initial exchange rates
    from sqlalchemy.sql import table, column
    from sqlalchemy import String, Numeric, DateTime
    import datetime

    exchange_rates = table('exchange_rates',
        column('currency', String),
        column('rate_to_jpy', Numeric),
        column('updated_at', DateTime)
    )

    op.bulk_insert(exchange_rates, [
        {'currency': 'JPY', 'rate_to_jpy': 1.0, 'updated_at': datetime.datetime.utcnow()},
        {'currency': 'USD', 'rate_to_jpy': 0.00667, 'updated_at': datetime.datetime.utcnow()},
        {'currency': 'VND', 'rate_to_jpy': 160.0, 'updated_at': datetime.datetime.utcnow()},
    ])


def downgrade() -> None:
    op.drop_index(op.f('ix_exchange_rates_currency'), table_name='exchange_rates')
    op.drop_table('exchange_rates')
    op.drop_column('app_settings', 'base_currency')
