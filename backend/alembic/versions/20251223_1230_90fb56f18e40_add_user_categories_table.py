"""add_user_categories_table

Revision ID: 90fb56f18e40
Revises: add_carry_over
Create Date: 2025-12-23 12:30:43.057664

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '90fb56f18e40'
down_revision: Union[str, None] = 'add_carry_over'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('icon', sa.String(length=10), nullable=False, server_default='📁'),
        sa.Column('type', sa.String(length=20), nullable=False, server_default='expense'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_user_category_name')
    )
    op.create_index(op.f('ix_user_categories_id'), 'user_categories', ['id'], unique=False)
    op.create_index(op.f('ix_user_categories_user_id'), 'user_categories', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_categories_user_id'), table_name='user_categories')
    op.drop_index(op.f('ix_user_categories_id'), table_name='user_categories')
    op.drop_table('user_categories')
