"""add_carry_over_to_budgets

Revision ID: add_carry_over
Revises: d45678901234
Create Date: 2025-12-23 09:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_carry_over'
down_revision: Union[str, None] = 'd45678901234'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add carry_over column to budgets table
    # This stores the amount carried over from the previous month
    # Can be positive (under budget) or negative (over budget)
    with op.batch_alter_table('budgets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('carry_over', sa.BigInteger(), nullable=True, server_default='0'))


def downgrade() -> None:
    with op.batch_alter_table('budgets', schema=None) as batch_op:
        batch_op.drop_column('carry_over')
