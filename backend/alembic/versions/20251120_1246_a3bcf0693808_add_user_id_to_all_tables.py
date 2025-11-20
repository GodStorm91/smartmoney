"""add_user_id_to_all_tables

Revision ID: a3bcf0693808
Revises: ba24d1be48df
Create Date: 2025-11-20 12:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3bcf0693808'
down_revision: Union[str, None] = 'ba24d1be48df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user_id columns as nullable first
    op.add_column('transactions', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('accounts', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('goals', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('app_settings', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('tags', sa.Column('user_id', sa.Integer(), nullable=True))

    # Update all existing records to belong to user_id = 1 (default user)
    op.execute("UPDATE transactions SET user_id = 1 WHERE user_id IS NULL")
    op.execute("UPDATE accounts SET user_id = 1 WHERE user_id IS NULL")
    op.execute("UPDATE goals SET user_id = 1 WHERE user_id IS NULL")
    op.execute("UPDATE app_settings SET user_id = 1 WHERE user_id IS NULL")
    op.execute("UPDATE tags SET user_id = 1 WHERE user_id IS NULL")

    # SQLite doesn't support ALTER COLUMN, so we need to work around
    # For now, keep columns nullable but add indexes
    # In production with PostgreSQL, we'd make them NOT NULL

    # Create indexes for performance
    op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('ix_accounts_user_id', 'accounts', ['user_id'])
    op.create_index('ix_goals_user_id', 'goals', ['user_id'])
    op.create_index('ix_app_settings_user_id', 'app_settings', ['user_id'])
    op.create_index('ix_tags_user_id', 'tags', ['user_id'])

    # Note: SQLite doesn't support adding foreign key constraints to existing tables
    # In production with PostgreSQL, we'd add:
    # op.create_foreign_key('fk_transactions_user', 'transactions', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    # etc.


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_tags_user_id', table_name='tags')
    op.drop_index('ix_app_settings_user_id', table_name='app_settings')
    op.drop_index('ix_goals_user_id', table_name='goals')
    op.drop_index('ix_accounts_user_id', table_name='accounts')
    op.drop_index('ix_transactions_user_id', table_name='transactions')

    # Drop columns
    op.drop_column('tags', 'user_id')
    op.drop_column('app_settings', 'user_id')
    op.drop_column('goals', 'user_id')
    op.drop_column('accounts', 'user_id')
    op.drop_column('transactions', 'user_id')
