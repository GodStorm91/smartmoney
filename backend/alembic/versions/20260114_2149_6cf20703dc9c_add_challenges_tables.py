"""add_challenges_tables

Revision ID: 6cf20703dc9c
Revises: 3f8be6cacb20
Create Date: 2026-01-14 21:49:23.902354

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6cf20703dc9c"
down_revision: Union[str, None] = "3f8be6cacb20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create challenges table
    op.create_table(
        "challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", sa.String(20), nullable=False),  # 'daily', 'weekly', 'monthly', 'special'
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column(
            "requirements", sa.JSON(), nullable=True
        ),  # JSON object with challenge requirements
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    # Create user_challenges table
    op.create_table(
        "user_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("challenge_id", sa.Integer(), nullable=False),
        sa.Column(
            "started_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("target", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "status", sa.String(20), nullable=False, server_default="'active'"
        ),  # 'active', 'completed', 'expired', 'failed'
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["challenge_id"],
            ["challenges.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create xp_multipliers table for special events
    op.create_table(
        "xp_multipliers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("multiplier", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column(
            "action_types", sa.JSON(), nullable=True
        ),  # List of action types affected, null = all
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Add more achievement-related columns to existing tables
    op.add_column("achievements", sa.Column("order_index", sa.Integer(), nullable=True))
    op.add_column(
        "achievements", sa.Column("is_secret", sa.Boolean(), nullable=False, server_default="0")
    )
    op.add_column(
        "achievements", sa.Column("prerequisite_achievement_id", sa.Integer(), nullable=True)
    )

    # Create indexes for performance
    op.create_index("ix_challenges_type", "challenges", ["type"])
    op.create_index("ix_challenges_active", "challenges", ["is_active"])
    op.create_index("ix_user_challenges_user_status", "user_challenges", ["user_id", "status"])
    op.create_index("ix_user_challenges_challenge_id", "user_challenges", ["challenge_id"])
    op.create_index(
        "ix_xp_multipliers_active", "xp_multipliers", ["is_active", "start_date", "end_date"]
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_xp_multipliers_active", "xp_multipliers")
    op.drop_index("ix_user_challenges_challenge_id", "user_challenges")
    op.drop_index("ix_user_challenges_user_status", "user_challenges")
    op.drop_index("ix_challenges_active", "challenges")
    op.drop_index("ix_challenges_type", "challenges")

    # Drop columns from achievements
    op.drop_column("achievements", "prerequisite_achievement_id")
    op.drop_column("achievements", "is_secret")
    op.drop_column("achievements", "order_index")

    # Drop tables
    op.drop_table("xp_multipliers")
    op.drop_table("user_challenges")
    op.drop_table("challenges")
