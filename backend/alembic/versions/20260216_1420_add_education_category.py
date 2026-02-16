"""Add Education parent category and subcategories.

Revision ID: add_education_category
Revises: add_spending_benchmarks
Create Date: 2026-02-16 14:20:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_education_category"
down_revision: Union[str, None] = "add_spending_benchmarks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get connection and tables
    conn = op.get_bind()

    # Insert Education parent category
    result = conn.execute(
        sa.text("""
            INSERT INTO categories (name, icon, type, is_system, parent_id)
            VALUES ('Education', '🎓', 'expense', true, NULL)
            RETURNING id
        """)
    )
    parent_id = result.fetchone()[0]

    # Insert Education subcategories
    subcategories = [
        ('Tuition', '📚'),
        ('Books', '📖'),
        ('Courses', '👨‍🎓'),
        ('Supplies', '✏️')
    ]

    for name, icon in subcategories:
        conn.execute(
            sa.text("""
                INSERT INTO categories (name, icon, type, is_system, parent_id)
                VALUES (:name, :icon, 'expense', true, :parent_id)
            """),
            {"name": name, "icon": icon, "parent_id": parent_id}
        )


def downgrade() -> None:
    conn = op.get_bind()

    # Delete Education category and its children (cascade will handle subcategories)
    conn.execute(
        sa.text("""
            DELETE FROM categories
            WHERE name = 'Education' AND is_system = true AND parent_id IS NULL
        """)
    )
