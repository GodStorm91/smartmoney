"""fix_base_date_to_integer_and_init_settings

Revision ID: 2347c23824af
Revises: e4bd70854b75
Create Date: 2025-11-18 20:15:10.587468

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '2347c23824af'
down_revision: Union[str, None] = 'e4bd70854b75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change base_date from DATE to INTEGER and initialize default settings."""
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table

    # Drop existing table
    op.drop_table('app_settings')

    # Recreate with base_date as INTEGER
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('starting_net_worth', sa.BigInteger(), nullable=False),
        sa.Column('base_date', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.CheckConstraint('id = 1', name='singleton'),
        sa.CheckConstraint('base_date >= 1 AND base_date <= 31', name='valid_base_date'),
        sa.PrimaryKeyConstraint('id')
    )

    # Insert default row
    conn = op.get_bind()
    conn.execute(
        text("INSERT INTO app_settings (id, currency, starting_net_worth, base_date) VALUES (1, 'JPY', 0, 25)")
    )


def downgrade() -> None:
    """Revert base_date back to DATE type."""
    # Drop table
    op.drop_table('app_settings')

    # Recreate with base_date as DATE
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('starting_net_worth', sa.BigInteger(), nullable=False),
        sa.Column('base_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.CheckConstraint('id = 1', name='singleton'),
        sa.PrimaryKeyConstraint('id')
    )
