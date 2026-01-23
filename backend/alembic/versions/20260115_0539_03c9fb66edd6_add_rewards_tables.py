"""add_rewards_tables

Revision ID: 03c9fb66edd6
Revises: 114da972442e
Create Date: 2026-01-15 05:39:29.702856

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "03c9fb66edd6"
down_revision: Union[str, None] = "114da972442e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Virtual themes
    op.create_table(
        "themes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", sa.String(20), nullable=False),  # 'color', 'gradient', 'image'
        sa.Column("preview_color", sa.String(20), nullable=True),
        sa.Column("css_variables", sa.JSON(), nullable=True),
        sa.Column("unlock_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    # User unlocked themes
    op.create_table(
        "user_themes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("theme_id", sa.Integer(), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["theme_id"],
            ["themes.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "theme_id"),
    )

    # Avatars/Profiles
    op.create_table(
        "avatars",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("emoji", sa.String(10), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("unlock_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("rarity", sa.String(20), nullable=False, server_default="common"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    # User unlocked avatars
    op.create_table(
        "user_avatars",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("avatar_id", sa.Integer(), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["avatar_id"],
            ["avatars.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "avatar_id"),
    )

    # User profile customization
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("title", sa.String(100), nullable=True),  # Earned title based on achievements
        sa.Column("selected_avatar_id", sa.Integer(), nullable=True),
        sa.Column("selected_theme_id", sa.Integer(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["selected_avatar_id"],
            ["avatars.id"],
        ),
        sa.ForeignKeyConstraint(
            ["selected_theme_id"],
            ["themes.id"],
        ),
    )

    # Seasonal events
    op.create_table(
        "seasonal_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("xp_multiplier", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("special_challenge_code", sa.String(50), nullable=True),
        sa.Column("theme_id", sa.Integer(), nullable=True),  # Event theme
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.ForeignKeyConstraint(
            ["theme_id"],
            ["themes.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    # Gamification settings
    op.create_table(
        "gamification_settings",
        sa.Column("user_id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("achievement_notifications", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("streak_reminders", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("challenge_reminders", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("sound_effects", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("show_on_profile", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("share_achievements", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    # Unlockable features
    op.create_table(
        "unlockable_features",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("required_level", sa.Integer(), nullable=False),
        sa.Column(
            "feature_type", sa.String(50), nullable=False
        ),  # 'analytics', 'export', 'api', etc.
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    # User unlocked features
    op.create_table(
        "user_unlocked_features",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("feature_id", sa.Integer(), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["feature_id"],
            ["unlockable_features.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "feature_id"),
    )

    # XP streak bonuses
    op.create_table(
        "xp_streak_bonuses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("streak_days", sa.Integer(), nullable=False),
        sa.Column("multiplier", sa.Float(), nullable=False),
        sa.Column("bonus_xp", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("streak_days"),
    )

    # Indexes
    op.create_index("ix_themes_type", "themes", ["type"])
    op.create_index("ix_themes_unlock_level", "themes", ["unlock_level"])
    op.create_index("ix_avatars_rarity", "avatars", ["rarity"])
    op.create_index("ix_avatars_unlock_level", "avatars", ["unlock_level"])
    op.create_index("ix_seasonal_events_dates", "seasonal_events", ["start_date", "end_date"])
    op.create_index("ix_unlockable_features_level", "unlockable_features", ["required_level"])


def downgrade() -> None:
    op.drop_index("ix_unlockable_features_level", "unlockable_features")
    op.drop_index("ix_seasonal_events_dates", "seasonal_events")
    op.drop_index("ix_avatars_unlock_level", "avatars")
    op.drop_index("ix_avatars_rarity", "avatars")
    op.drop_index("ix_themes_unlock_level", "themes")
    op.drop_index("ix_themes_type", "themes")
    op.drop_table("xp_streak_bonuses")
    op.drop_table("user_unlocked_features")
    op.drop_table("unlockable_features")
    op.drop_table("gamification_settings")
    op.drop_table("seasonal_events")
    op.drop_table("user_profiles")
    op.drop_table("user_avatars")
    op.drop_table("avatars")
    op.drop_table("user_themes")
    op.drop_table("themes")
