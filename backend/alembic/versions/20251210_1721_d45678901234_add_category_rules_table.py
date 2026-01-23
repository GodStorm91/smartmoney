"""add_category_rules_table

Revision ID: d45678901234
Revises: c23333551118
Create Date: 2025-12-10 17:21:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd45678901234'
down_revision: Union[str, None] = 'c23333551118'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'category_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('keyword', sa.String(100), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('match_type', sa.String(20), default='contains', nullable=False),
        sa.Column('priority', sa.Integer(), default=0, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'keyword', name='uq_user_keyword'),
    )

    # Create indexes
    op.create_index('ix_category_rules_id', 'category_rules', ['id'])
    op.create_index('ix_category_rules_user_id', 'category_rules', ['user_id'])
    op.create_index('ix_category_rules_keyword', 'category_rules', ['keyword'])


def downgrade() -> None:
    op.drop_index('ix_category_rules_keyword', table_name='category_rules')
    op.drop_index('ix_category_rules_user_id', table_name='category_rules')
    op.drop_index('ix_category_rules_id', table_name='category_rules')
    op.drop_table('category_rules')
