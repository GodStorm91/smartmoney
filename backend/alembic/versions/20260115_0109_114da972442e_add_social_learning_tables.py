"""add_social_learning_tables

Revision ID: 114da972442e
Revises: 6cf20703dc9c
Create Date: 2026-01-15 01:09:49.282831

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "114da972442e"
down_revision: Union[str, None] = "6cf20703dc9c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Quiz tables
    op.create_table(
        "quizzes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("topic", sa.String(50), nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("time_limit", sa.Integer(), nullable=True),
        sa.Column("passing_score", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_answer", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["quiz_id"],
            ["quizzes.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "user_quiz_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("correct_answers", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("time_taken", sa.Integer(), nullable=True),
        sa.Column(
            "attempted_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["quiz_id"],
            ["quizzes.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Learning paths
    op.create_table(
        "learning_paths",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(20), nullable=False),
        sa.Column("total_duration", sa.Integer(), nullable=True),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "learning_modules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("path_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["path_id"],
            ["learning_paths.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "user_learning_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("path_id", sa.Integer(), nullable=False),
        sa.Column("modules_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_modules", sa.Integer(), nullable=False),
        sa.Column("progress_percentage", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "started_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["path_id"],
            ["learning_paths.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Leaderboards
    op.create_table(
        "leaderboard_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("metric", sa.String(50), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("period_value", sa.String(20), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("percentile", sa.Float(), nullable=True),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "metric", "period", "period_value"),
    )

    # Social groups
    op.create_table(
        "social_groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("join_code", sa.String(20), nullable=True),
        sa.Column("privacy", sa.String(20), nullable=False, server_default="private"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "group_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column(
            "joined_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["social_groups.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "group_id"),
    )

    op.create_table(
        "group_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("target_value", sa.Float(), nullable=False),
        sa.Column("current_value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["social_groups.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Indexes
    op.create_index("ix_quizzes_topic", "quizzes", ["topic"])
    op.create_index("ix_user_quiz_attempts_user", "user_quiz_attempts", ["user_id"])
    op.create_index("ix_learning_paths_difficulty", "learning_paths", ["difficulty"])
    op.create_index("ix_learning_progress_user", "user_learning_progress", ["user_id"])
    op.create_index("ix_leaderboard_metric", "leaderboard_entries", ["metric", "period"])
    op.create_index("ix_group_members_user", "group_members", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_group_members_user", "group_members")
    op.drop_index("ix_leaderboard_metric", "leaderboard_entries")
    op.drop_index("ix_learning_progress_user", "user_learning_progress")
    op.drop_index("ix_learning_paths_difficulty", "learning_paths")
    op.drop_index("ix_user_quiz_attempts_user", "user_quiz_attempts")
    op.drop_index("ix_quizzes_topic", "quizzes")
    op.drop_table("group_challenges")
    op.drop_table("group_members")
    op.drop_table("social_groups")
    op.drop_table("leaderboard_entries")
    op.drop_table("user_learning_progress")
    op.drop_table("learning_modules")
    op.drop_table("learning_paths")
    op.drop_table("user_quiz_attempts")
    op.drop_table("quiz_questions")
    op.drop_table("quizzes")
