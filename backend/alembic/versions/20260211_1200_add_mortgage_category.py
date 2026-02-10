"""Add Mortgage as system child category under Housing

Revision ID: add_mortgage_category
Revises: add_recurring_transfer
Create Date: 2026-02-11 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_mortgage_category"
down_revision: Union[str, None] = "add_recurring_transfer"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Find Housing parent category ID
    result = conn.execute(sa.text(
        "SELECT id FROM categories WHERE name = 'Housing' AND parent_id IS NULL AND is_system = true AND type = 'expense'"
    ))
    housing_id = result.scalar()

    if housing_id:
        # Check if Mortgage already exists under Housing
        result = conn.execute(sa.text(
            "SELECT id FROM categories WHERE name = 'Mortgage' AND parent_id = :parent_id AND is_system = true"
        ), {"parent_id": housing_id})
        existing = result.scalar()

        if not existing:
            conn.execute(sa.text("""
                INSERT INTO categories (name, icon, type, parent_id, is_system, display_order)
                VALUES ('Mortgage', '🏦', 'expense', :parent_id, true, 5)
            """), {"parent_id": housing_id})


def downgrade() -> None:
    conn = op.get_bind()

    # Find Housing parent category ID
    result = conn.execute(sa.text(
        "SELECT id FROM categories WHERE name = 'Housing' AND parent_id IS NULL AND is_system = true AND type = 'expense'"
    ))
    housing_id = result.scalar()

    if housing_id:
        conn.execute(sa.text(
            "DELETE FROM categories WHERE name = 'Mortgage' AND parent_id = :parent_id AND is_system = true"
        ), {"parent_id": housing_id})
