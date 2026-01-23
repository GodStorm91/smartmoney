"""add_receipts_table

Revision ID: 2601071300
Revises: 2601071200
Create Date: 2026-01-07 13:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2601071300'
down_revision: Union[str, None] = '2601071200'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'receipts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('transaction_id', sa.Integer(), nullable=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('ocr_text', sa.Text(), nullable=True),
        sa.Column('extracted_merchant', sa.String(255), nullable=True),
        sa.Column('extracted_amount', sa.Integer(), nullable=True),
        sa.Column('extracted_date', sa.DateTime(), nullable=True),
        sa.Column('extracted_category', sa.String(100), nullable=True),
        sa.Column('is_processed', sa.Boolean(), default=False, nullable=False),
        sa.Column('processing_error', sa.String(500), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_receipts_user_id', 'receipts', ['user_id'])
    op.create_index('ix_receipts_transaction_id', 'receipts', ['transaction_id'])


def downgrade() -> None:
    op.drop_index('ix_receipts_transaction_id', table_name='receipts')
    op.drop_index('ix_receipts_user_id', table_name='receipts')
    op.drop_table('receipts')
