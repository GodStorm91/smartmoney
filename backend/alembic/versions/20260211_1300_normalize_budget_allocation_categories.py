"""Normalize budget allocation category names to match system parent categories

Data migration: fixes mismatched AI-generated allocation names to match
the real parent category hierarchy (Food, Housing, Transportation,
Entertainment, Shopping, Health, Communication, Other).

When normalization causes duplicates within a budget, amounts are summed
and extra rows are deleted. Safe to run multiple times (idempotent).

Revision ID: normalize_alloc_categories
Revises: add_mortgage_category
Create Date: 2026-02-11 13:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "normalize_alloc_categories"
down_revision: Union[str, None] = "add_mortgage_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Mapping of known AI-generated names to real parent category names.
# Only includes names that are known to appear in production data.
CATEGORY_NAME_MAPPING: dict[str, str] = {
    "Food & Dining": "Food",
    "Housing & Utilities": "Housing",
    "Insurance & Medical": "Health",
    "Personal & Entertainment": "Entertainment",
    "Gifts & Transfers": "Other",
    "Personal Expenses": "Shopping",
    "Personal & Discretionary": "Shopping",
    "Utilities": "Housing",
}


def upgrade() -> None:
    conn = op.get_bind()

    # Step 1: Rename categories that have a mapping
    for old_name, new_name in CATEGORY_NAME_MAPPING.items():
        conn.execute(sa.text(
            "UPDATE budget_allocations SET category = :new_name "
            "WHERE category = :old_name"
        ), {"old_name": old_name, "new_name": new_name})

    # Step 2: Merge duplicates within each budget.
    # After renaming, a budget may have two rows with the same category.
    # Find budgets with duplicate categories, sum amounts, keep lowest id.
    dupes = conn.execute(sa.text("""
        SELECT budget_id, category, SUM(amount) AS total_amount,
               MIN(id) AS keep_id, COUNT(*) AS cnt
        FROM budget_allocations
        GROUP BY budget_id, category
        HAVING COUNT(*) > 1
    """)).fetchall()

    for row in dupes:
        budget_id = row.budget_id
        category = row.category
        total_amount = row.total_amount
        keep_id = row.keep_id

        # Update the kept row with summed amount
        conn.execute(sa.text(
            "UPDATE budget_allocations SET amount = :total "
            "WHERE id = :keep_id"
        ), {"total": total_amount, "keep_id": keep_id})

        # Delete the duplicate rows
        conn.execute(sa.text(
            "DELETE FROM budget_allocations "
            "WHERE budget_id = :budget_id AND category = :category AND id != :keep_id"
        ), {"budget_id": budget_id, "category": category, "keep_id": keep_id})


def downgrade() -> None:
    # Data migration: no automatic downgrade.
    # The original category names were AI-generated approximations,
    # so restoring them would not be meaningful.
    pass
