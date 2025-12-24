"""add language field to budgets table

Revision ID: cdea472d293c
Revises: 1dbeba5261c2
Create Date: 2025-12-24 10:46:37.956452

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cdea472d293c'
down_revision: Union[str, None] = '1dbeba5261c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add language column to budgets table with default 'ja'
    op.add_column('budgets', sa.Column('language', sa.String(length=5), nullable=False, server_default='ja'))


def downgrade() -> None:
    op.drop_column('budgets', 'language')
