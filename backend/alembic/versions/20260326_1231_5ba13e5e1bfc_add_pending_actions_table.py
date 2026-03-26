"""add pending_actions table

Revision ID: 5ba13e5e1bfc
Revises: 3600283b2652
Create Date: 2026-03-26 12:31:24.770938

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5ba13e5e1bfc'
down_revision: Union[str, None] = '3600283b2652'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('pending_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('surface', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('params', sa.JSON(), nullable=False),
        sa.Column('undo_snapshot', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('surfaced_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(), nullable=True),
        sa.Column('undone_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pending_actions_id', 'pending_actions', ['id'], unique=False)
    op.create_index('ix_pending_actions_user_id', 'pending_actions', ['user_id'], unique=False)
    op.create_index('ix_pending_action_expires', 'pending_actions', ['expires_at'], unique=False)
    op.create_index('ix_pending_action_user_status', 'pending_actions', ['user_id', 'status'], unique=False)
    op.create_index('ix_pending_action_user_type_status', 'pending_actions', ['user_id', 'type', 'status'], unique=False)
    # Partial unique index: only 1 active (pending/surfaced) action per user+type
    op.execute(
        "CREATE UNIQUE INDEX uq_pending_action_active ON pending_actions (user_id, type) "
        "WHERE status IN ('pending', 'surfaced')"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_pending_action_active")
    op.drop_index('ix_pending_action_user_type_status', table_name='pending_actions')
    op.drop_index('ix_pending_action_user_status', table_name='pending_actions')
    op.drop_index('ix_pending_action_expires', table_name='pending_actions')
    op.drop_index('ix_pending_actions_user_id', table_name='pending_actions')
    op.drop_index('ix_pending_actions_id', table_name='pending_actions')
    op.drop_table('pending_actions')
