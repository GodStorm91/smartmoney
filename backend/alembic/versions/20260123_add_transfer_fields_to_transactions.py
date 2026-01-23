"""Add transfer_id and transfer_type to transactions

Revision ID: add_transfer_fields
Revises: 
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_transfer_fields_20260123'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add transfer_id column
    op.add_column('transactions', sa.Column('transfer_id', sa.String(36), nullable=True))
    op.create_index('ix_transactions_transfer_id', 'transactions', ['transfer_id'], unique=False)
    
    # Add transfer_type column
    op.add_column('transactions', sa.Column('transfer_type', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_index('ix_transactions_transfer_id', table_name='transactions')
    op.drop_column('transactions', 'transfer_type')
    op.drop_column('transactions', 'transfer_id')
