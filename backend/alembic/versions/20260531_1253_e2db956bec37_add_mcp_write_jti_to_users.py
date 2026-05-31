"""add mcp write jti to users

Revision ID: e2db956bec37
Revises: a1b2c3d4e5f6
Create Date: 2026-05-31 12:53:16.408267

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2db956bec37'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("mcp_write_token_jti", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("mcp_write_token_created_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "mcp_write_token_created_at")
    op.drop_column("users", "mcp_write_token_jti")
