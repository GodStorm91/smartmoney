"""add receipt_url to transactions

Revision ID: add_receipt_url
Revises: 68146f4f5c5c
Create Date: 2026-01-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'add_receipt_url'
down_revision: Union[str, None] = '68146f4f5c5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('receipt_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('transactions', 'receipt_url')
