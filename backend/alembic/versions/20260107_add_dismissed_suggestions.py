"""Add dismissed_suggestions table.

Revision ID: 20260107_dismissed
Revises: add_receipt_url
Create Date: 2026-01-07
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260107_dismissed'
down_revision = 'add_receipt_url'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'dismissed_suggestions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('suggestion_hash', sa.String(64), nullable=False),
        sa.Column('dismissed_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'suggestion_hash', name='uq_user_suggestion')
    )
    op.create_index('ix_dismissed_suggestions_id', 'dismissed_suggestions', ['id'])
    op.create_index('ix_dismissed_suggestions_user_id', 'dismissed_suggestions', ['user_id'])
    op.create_index('ix_dismissed_suggestions_suggestion_hash', 'dismissed_suggestions', ['suggestion_hash'])


def downgrade() -> None:
    op.drop_index('ix_dismissed_suggestions_suggestion_hash', table_name='dismissed_suggestions')
    op.drop_index('ix_dismissed_suggestions_user_id', table_name='dismissed_suggestions')
    op.drop_index('ix_dismissed_suggestions_id', table_name='dismissed_suggestions')
    op.drop_table('dismissed_suggestions')
