"""Create spending_benchmarks table.

Revision ID: add_spending_benchmarks
Revises: add_household_profile
Create Date: 2026-02-16 14:10:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_spending_benchmarks"
down_revision: Union[str, None] = "add_household_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "spending_benchmarks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("data_year", sa.Integer(), nullable=False),
        sa.Column("prefecture_code", sa.String(2), nullable=True),
        sa.Column("region", sa.String(20), nullable=True),
        sa.Column("income_quintile", sa.Integer(), nullable=True),
        sa.Column("household_size", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("subcategory", sa.String(50), nullable=True),
        sa.Column("monthly_amount", sa.Integer(), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Create indexes for efficient lookup
    op.create_index(
        "idx_benchmarks_profile",
        "spending_benchmarks",
        ["prefecture_code", "income_quintile", "household_size"]
    )
    op.create_index(
        "idx_benchmarks_category",
        "spending_benchmarks",
        ["category", "data_year"]
    )


def downgrade() -> None:
    op.drop_index("idx_benchmarks_category", table_name="spending_benchmarks")
    op.drop_index("idx_benchmarks_profile", table_name="spending_benchmarks")
    op.drop_table("spending_benchmarks")
