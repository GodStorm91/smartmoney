"""add goal revision fields for named goals and account linking

Revision ID: f8a2b3c4d5e6
Revises: cdea472d293c
Create Date: 2025-12-25 09:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a2b3c4d5e6'
down_revision: Union[str, None] = 'cdea472d293c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Add new columns to goals table
    op.add_column('goals', sa.Column('goal_type', sa.String(30), nullable=False, server_default='custom'))
    op.add_column('goals', sa.Column('name', sa.String(100), nullable=True))
    op.add_column('goals', sa.Column('priority', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('goals', sa.Column('account_id', sa.Integer(), nullable=True))
    op.add_column('goals', sa.Column('ai_advice', sa.Text(), nullable=True))
    op.add_column('goals', sa.Column('milestone_25_at', sa.DateTime(), nullable=True))
    op.add_column('goals', sa.Column('milestone_50_at', sa.DateTime(), nullable=True))
    op.add_column('goals', sa.Column('milestone_75_at', sa.DateTime(), nullable=True))
    op.add_column('goals', sa.Column('milestone_100_at', sa.DateTime(), nullable=True))

    # Add foreign key constraint for account_id (PostgreSQL only - SQLite doesn't support ALTER FK)
    if conn.dialect.name == 'postgresql':
        op.create_foreign_key(
            'fk_goals_account_id', 'goals', 'accounts',
            ['account_id'], ['id'], ondelete='SET NULL'
        )

    # Add index for priority ordering
    op.create_index('ix_goals_user_priority', 'goals', ['user_id', 'priority'])

    # Drop the old unique constraint on user_id + years (no longer needed)
    if conn.dialect.name == 'postgresql':
        op.execute("DROP INDEX IF EXISTS ix_user_years_unique")

    # Migrate existing data - set name based on years
    if conn.dialect.name == 'postgresql':
        op.execute("UPDATE goals SET name = years::text || '年貯蓄目標', priority = id WHERE name IS NULL")
    else:
        # SQLite
        op.execute("UPDATE goals SET name = CAST(years AS TEXT) || '年貯蓄目標', priority = id WHERE name IS NULL")


def downgrade() -> None:
    conn = op.get_bind()

    # Drop the new columns in reverse order
    op.drop_index('ix_goals_user_priority', table_name='goals')
    if conn.dialect.name == 'postgresql':
        op.drop_constraint('fk_goals_account_id', 'goals', type_='foreignkey')
    op.drop_column('goals', 'milestone_100_at')
    op.drop_column('goals', 'milestone_75_at')
    op.drop_column('goals', 'milestone_50_at')
    op.drop_column('goals', 'milestone_25_at')
    op.drop_column('goals', 'ai_advice')
    op.drop_column('goals', 'account_id')
    op.drop_column('goals', 'priority')
    op.drop_column('goals', 'name')
    op.drop_column('goals', 'goal_type')
