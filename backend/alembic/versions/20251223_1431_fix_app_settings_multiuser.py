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
    # Drop the singleton constraint that forced id=1
    op.drop_constraint('singleton', 'app_settings', type_='check')

    # Make user_id NOT NULL (it should be required for multi-user)
    # First update any NULL user_ids if they exist
    op.execute("UPDATE app_settings SET user_id = 1 WHERE user_id IS NULL")

    # Alter column to NOT NULL
    op.alter_column('app_settings', 'user_id',
                    existing_type=sa.Integer(),
                    nullable=False)

    # Add unique constraint on user_id (one settings per user)
    op.create_unique_constraint('uq_app_settings_user_id', 'app_settings', ['user_id'])

    # Reset the sequence to max id + 1
    op.execute("""
        SELECT setval(
            pg_get_serial_sequence('app_settings', 'id'),
            COALESCE((SELECT MAX(id) FROM app_settings), 0) + 1,
            false
        )
    """)


def downgrade() -> None:
    # Remove unique constraint
    op.drop_constraint('uq_app_settings_user_id', 'app_settings', type_='unique')

    # Make user_id nullable again
    op.alter_column('app_settings', 'user_id',
                    existing_type=sa.Integer(),
                    nullable=True)

    # Restore singleton constraint
    op.create_check_constraint('singleton', 'app_settings', 'id = 1')
