"""add smart actions settings columns

Revision ID: 8f6074480db0
Revises: 5ba13e5e1bfc
Create Date: 2026-03-26 17:48:47.591311

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f6074480db0'
down_revision: Union[str, None] = '5ba13e5e1bfc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'app_settings',
        sa.Column('smart_actions_expanded', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.add_column(
        'app_settings',
        sa.Column('smart_actions_auto_execute', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('app_settings', 'smart_actions_auto_execute')
    op.drop_column('app_settings', 'smart_actions_expanded')
