"""Fix app_settings for multi-user support

Revision ID: fix_app_settings_multiuser
Revises: 90fb56f18e40
Create Date: 2025-12-23 14:31:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_app_settings_multiuser'
down_revision: Union[str, None] = '90fb56f18e40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER constraints, use batch mode
    # First update any NULL user_ids if they exist
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE app_settings SET user_id = 1 WHERE user_id IS NULL"))

    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('app_settings', recreate='always') as batch_op:
        # Make user_id NOT NULL
        batch_op.alter_column('user_id',
                              existing_type=sa.Integer(),
                              nullable=False)
        # Add unique constraint on user_id (one settings per user)
        batch_op.create_unique_constraint('uq_app_settings_user_id', ['user_id'])


def downgrade() -> None:
    with op.batch_alter_table('app_settings', recreate='always') as batch_op:
        # Remove unique constraint
        batch_op.drop_constraint('uq_app_settings_user_id', type_='unique')
        # Make user_id nullable again
        batch_op.alter_column('user_id',
                              existing_type=sa.Integer(),
                              nullable=True)
