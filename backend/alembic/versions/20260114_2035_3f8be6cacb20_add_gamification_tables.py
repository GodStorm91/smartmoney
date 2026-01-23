"""add_gamification_tables

Revision ID: 3f8be6cacb20
Revises: 2601071300
Create Date: 2026-01-14 20:35:56.682956

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3f8be6cacb20"
down_revision: Union[str, None] = "2601071300"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_gamification table
    op.create_table(
        "user_gamification",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_login_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # Create achievements table
    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("rarity", sa.String(20), nullable=True),
        sa.Column("trigger_type", sa.String(50), nullable=True),
        sa.Column("trigger_value", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    # Create user_achievements table
    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("achievement_id", sa.Integer(), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["achievement_id"],
            ["achievements.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "achievement_id"),
    )

    # Create xp_events table for tracking XP history
    op.create_table(
        "xp_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("xp_earned", sa.Integer(), nullable=False),
        sa.Column("event_metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for performance
    op.create_index("ix_user_gamification_level", "user_gamification", ["current_level"])
    op.create_index("ix_user_gamification_xp", "user_gamification", ["total_xp"])
    op.create_index("ix_achievements_category", "achievements", ["category"])
    op.create_index("ix_xp_events_user_action", "xp_events", ["user_id", "action"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_xp_events_user_action", "xp_events")
    op.drop_index("ix_achievements_category", "achievements")
    op.drop_index("ix_user_gamification_xp", "user_gamification")
    op.drop_index("ix_user_gamification_level", "user_gamification")

    # Drop tables
    op.drop_table("xp_events")
    op.drop_table("user_achievements")
    op.drop_table("achievements")
    op.drop_table("user_gamification")
