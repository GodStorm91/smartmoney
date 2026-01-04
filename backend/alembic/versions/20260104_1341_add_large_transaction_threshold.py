"""add_large_transaction_threshold

Revision ID: add_large_tx_threshold
Revises: 6a8f0ddffe64
Create Date: 2026-01-04 13:41:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_large_tx_threshold'
down_revision: Union[str, None] = '6a8f0ddffe64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add large_transaction_threshold column with default 1,000,000 JPY
    op.add_column(
        'app_settings',
        sa.Column('large_transaction_threshold', sa.BigInteger(), nullable=False, server_default='1000000')
    )


def downgrade() -> None:
    op.drop_column('app_settings', 'large_transaction_threshold')
