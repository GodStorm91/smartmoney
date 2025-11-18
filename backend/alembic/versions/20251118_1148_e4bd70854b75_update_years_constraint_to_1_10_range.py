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
    # SQLite doesn't support ALTER CHECK CONSTRAINT, so recreate table
    op.execute("""
        CREATE TABLE goals_new (
            id INTEGER NOT NULL PRIMARY KEY,
            years INTEGER NOT NULL,
            target_amount BIGINT NOT NULL,
            start_date DATE,
            created_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
            CONSTRAINT positive_target CHECK (target_amount > 0),
            CONSTRAINT valid_years CHECK (years >= 1 AND years <= 10)
        );
    """)

    # Copy data from old table
    op.execute("INSERT INTO goals_new SELECT * FROM goals;")

    # Drop old table
    op.execute("DROP TABLE goals;")

    # Rename new table
    op.execute("ALTER TABLE goals_new RENAME TO goals;")

    # Recreate indexes
    op.execute("CREATE INDEX ix_goals_id ON goals (id);")
    op.execute("CREATE UNIQUE INDEX ix_years_unique ON goals (years);")


def downgrade() -> None:
    # Revert to old constraint
    op.execute("""
        CREATE TABLE goals_new (
            id INTEGER NOT NULL PRIMARY KEY,
            years INTEGER NOT NULL,
            target_amount BIGINT NOT NULL,
            start_date DATE,
            created_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
            CONSTRAINT positive_target CHECK (target_amount > 0),
            CONSTRAINT valid_years CHECK (years IN (1, 3, 5, 10))
        );
    """)

    op.execute("INSERT INTO goals_new SELECT * FROM goals;")
    op.execute("DROP TABLE goals;")
    op.execute("ALTER TABLE goals_new RENAME TO goals;")
    op.execute("CREATE INDEX ix_goals_id ON goals (id);")
    op.execute("CREATE UNIQUE INDEX ix_years_unique ON goals (years);")
