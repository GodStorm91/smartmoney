"""add goal last_milestone_pct

Revision ID: 09bc2d60a1dd
Revises: d88841555df8
Create Date: 2026-03-01 14:08:52.905820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09bc2d60a1dd'
down_revision: Union[str, None] = 'd88841555df8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('goals', sa.Column('last_milestone_pct', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('goals', 'last_milestone_pct')
