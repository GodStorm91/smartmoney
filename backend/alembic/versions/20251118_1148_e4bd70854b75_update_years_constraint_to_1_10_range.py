"""Update years constraint to 1-10 range

Revision ID: e4bd70854b75
Revises: d9ce81283511
Create Date: 2025-11-18 11:48:14.038310

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4bd70854b75'
down_revision: Union[str, None] = 'd9ce81283511'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL: Drop and recreate constraint
    op.execute("ALTER TABLE goals DROP CONSTRAINT IF EXISTS valid_years;")
    op.execute("ALTER TABLE goals ADD CONSTRAINT valid_years CHECK (years >= 1 AND years <= 10);")


def downgrade() -> None:
    # PostgreSQL: Revert to old constraint
    op.execute("ALTER TABLE goals DROP CONSTRAINT IF EXISTS valid_years;")
    op.execute("ALTER TABLE goals ADD CONSTRAINT valid_years CHECK (years IN (1, 3, 5, 10));")
