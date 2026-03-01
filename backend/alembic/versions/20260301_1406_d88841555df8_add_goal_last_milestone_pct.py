"""add goal last_milestone_pct

Revision ID: d88841555df8
Revises: add_education_category
Create Date: 2026-03-01 14:06:46.307911

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd88841555df8'
down_revision: Union[str, None] = 'add_education_category'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('goals', sa.Column('last_milestone_pct', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('goals', 'last_milestone_pct')
