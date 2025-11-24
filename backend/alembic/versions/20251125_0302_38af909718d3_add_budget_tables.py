"""add_budget_tables

Revision ID: 38af909718d3
Revises: fix_goals_unique
Create Date: 2025-11-25 03:02:01.822526

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38af909718d3'
down_revision: Union[str, None] = 'fix_goals_unique'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add budget settings to app_settings
    with op.batch_alter_table('app_settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('budget_carry_over', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('budget_email_alerts', sa.Boolean(), nullable=False, server_default='true'))

    # Create budgets table
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('month', sa.String(7), nullable=False),
        sa.Column('monthly_income', sa.BigInteger(), nullable=False),
        sa.Column('savings_target', sa.BigInteger(), nullable=True),
        sa.Column('advice', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_budgets_id', 'budgets', ['id'], unique=False)
    op.create_index('ix_budgets_user_id', 'budgets', ['user_id'], unique=False)
    op.create_index('ix_budget_user_month_unique', 'budgets', ['user_id', 'month'], unique=True)

    # Create budget_allocations table
    op.create_table(
        'budget_allocations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('budget_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['budget_id'], ['budgets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_budget_allocations_id', 'budget_allocations', ['id'], unique=False)
    op.create_index('ix_budget_allocations_budget_id', 'budget_allocations', ['budget_id'], unique=False)

    # Create budget_feedback table
    op.create_table(
        'budget_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('budget_id', sa.Integer(), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['budget_id'], ['budgets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_budget_feedback_id', 'budget_feedback', ['id'], unique=False)
    op.create_index('ix_budget_feedback_budget_id', 'budget_feedback', ['budget_id'], unique=False)


def downgrade() -> None:
    # Drop budget tables
    op.drop_table('budget_feedback')
    op.drop_table('budget_allocations')
    op.drop_table('budgets')

    # Remove budget settings
    with op.batch_alter_table('app_settings', schema=None) as batch_op:
        batch_op.drop_column('budget_email_alerts')
        batch_op.drop_column('budget_carry_over')
