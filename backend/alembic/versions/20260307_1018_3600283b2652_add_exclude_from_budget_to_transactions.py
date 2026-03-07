"""add exclude_from_budget to transactions

Revision ID: 3600283b2652
Revises: 9bc23e073d14
Create Date: 2026-03-07 10:18:56.688033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3600283b2652'
down_revision: Union[str, None] = '9bc23e073d14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('exclude_from_budget', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('transactions', 'exclude_from_budget')
