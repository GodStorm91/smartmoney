"""add_currency_to_goals

Revision ID: a6d94e3c6dd7
Revises: f8a2b3c4d5e6
Create Date: 2025-12-25 11:49:50.220276

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6d94e3c6dd7'
down_revision: Union[str, None] = 'f8a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add currency column to goals table with default value 'JPY'
    op.add_column('goals', sa.Column('currency', sa.String(length=3), nullable=False, server_default='JPY'))


def downgrade() -> None:
    op.drop_column('goals', 'currency')
