"""add position cost basis source columns

Revision ID: cost_basis_sources
Revises: e2db956bec37
Create Date: 2026-06-02

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


revision: str = "cost_basis_sources"
down_revision: Union[str, None] = "e2db956bec37"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    existing = _columns("position_cost_basis")
    with op.batch_alter_table("position_cost_basis") as batch:
        if "derived_basis_usd" not in existing:
            batch.add_column(sa.Column("derived_basis_usd", sa.Numeric(18, 2), nullable=True))
        if "manual_basis_usd" not in existing:
            batch.add_column(sa.Column("manual_basis_usd", sa.Numeric(18, 2), nullable=True))
        if "note" not in existing:
            batch.add_column(sa.Column("note", sa.String(500), nullable=True))
        if "derived_at" not in existing:
            batch.add_column(sa.Column("derived_at", sa.DateTime(), nullable=True))
        if "updated_at" not in existing:
            batch.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))

    op.execute(
        """
        UPDATE position_cost_basis
        SET manual_basis_usd = total_usd,
            updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
        WHERE manual_basis_usd IS NULL
          AND derived_basis_usd IS NULL
        """
    )

    if "ix_position_cost_basis_user_position" not in _indexes("position_cost_basis"):
        op.create_index(
            "ix_position_cost_basis_user_position",
            "position_cost_basis",
            ["user_id", "position_id"],
        )


def downgrade() -> None:
    if "ix_position_cost_basis_user_position" in _indexes("position_cost_basis"):
        op.drop_index("ix_position_cost_basis_user_position", table_name="position_cost_basis")

    existing = _columns("position_cost_basis")
    with op.batch_alter_table("position_cost_basis") as batch:
        for column_name in (
            "updated_at",
            "derived_at",
            "note",
            "manual_basis_usd",
            "derived_basis_usd",
        ):
            if column_name in existing:
                batch.drop_column(column_name)
