"""add mcp token jti to users

Revision ID: a1b2c3d4e5f6
Revises: 34f4d1d8c1a2
Create Date: 2026-05-23 08:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "34f4d1d8c1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("mcp_token_jti", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("mcp_token_created_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "mcp_token_created_at")
    op.drop_column("users", "mcp_token_jti")
