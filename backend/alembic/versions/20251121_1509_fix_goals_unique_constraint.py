"""fix_goals_unique_constraint_per_user

Revision ID: fix_goals_unique
Revises: a3bcf0693808
Create Date: 2025-11-21 15:09:00

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'fix_goals_unique'
down_revision: Union[str, None] = 'a3bcf0693808'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old unique index on years only
    op.drop_index('ix_years_unique', table_name='goals')

    # Create new unique index on (user_id, years)
    op.create_index('ix_user_years_unique', 'goals', ['user_id', 'years'], unique=True)


def downgrade() -> None:
    # Drop new unique index
    op.drop_index('ix_user_years_unique', table_name='goals')

    # Recreate old unique index on years only
    op.create_index('ix_years_unique', 'goals', ['years'], unique=True)
