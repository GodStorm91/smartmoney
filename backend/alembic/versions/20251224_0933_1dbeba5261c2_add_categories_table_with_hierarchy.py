"""add_categories_table_with_hierarchy

Revision ID: 1dbeba5261c2
Revises: fix_app_settings_multiuser
Create Date: 2025-12-24 09:33:03.705126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1dbeba5261c2'
down_revision: Union[str, None] = 'fix_app_settings_multiuser'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# System categories to seed
EXPENSE_PARENTS = [
    {"name": "Food", "icon": "🍽️", "order": 1},
    {"name": "Housing", "icon": "🏠", "order": 2},
    {"name": "Transportation", "icon": "🚗", "order": 3},
    {"name": "Entertainment", "icon": "🎬", "order": 4},
    {"name": "Shopping", "icon": "🛍️", "order": 5},
    {"name": "Health", "icon": "🏥", "order": 6},
    {"name": "Communication", "icon": "📱", "order": 7},
    {"name": "Other", "icon": "📦", "order": 8},
]

EXPENSE_CHILDREN = {
    "Food": [
        {"name": "Groceries", "icon": "🛒"},
        {"name": "Dining", "icon": "🍜"},
        {"name": "Cafe", "icon": "☕"},
        {"name": "Convenience", "icon": "🏪"},
        {"name": "Delivery", "icon": "🛵"},
    ],
    "Housing": [
        {"name": "Rent", "icon": "🏠"},
        {"name": "Utilities", "icon": "💡"},
        {"name": "Maintenance", "icon": "🔧"},
        {"name": "Furniture", "icon": "🪑"},
    ],
    "Transportation": [
        {"name": "Train", "icon": "🚃"},
        {"name": "Bus", "icon": "🚌"},
        {"name": "Gas", "icon": "⛽"},
        {"name": "Parking", "icon": "🅿️"},
        {"name": "Taxi", "icon": "🚕"},
    ],
    "Entertainment": [
        {"name": "Movies", "icon": "🎬"},
        {"name": "Games", "icon": "🎮"},
        {"name": "Streaming", "icon": "📺"},
        {"name": "Hobbies", "icon": "🎨"},
        {"name": "Travel", "icon": "✈️"},
    ],
    "Shopping": [
        {"name": "Clothing", "icon": "👕"},
        {"name": "Electronics", "icon": "📱"},
        {"name": "Home", "icon": "🏡"},
        {"name": "Personal", "icon": "🧴"},
    ],
    "Health": [
        {"name": "Medical", "icon": "🏥"},
        {"name": "Pharmacy", "icon": "💊"},
        {"name": "Fitness", "icon": "💪"},
        {"name": "Insurance", "icon": "🛡️"},
    ],
    "Communication": [
        {"name": "Phone", "icon": "📞"},
        {"name": "Internet", "icon": "🌐"},
        {"name": "Subscriptions", "icon": "📋"},
    ],
    "Other": [
        {"name": "Misc", "icon": "📦"},
        {"name": "Fees", "icon": "💳"},
        {"name": "Gifts", "icon": "🎁"},
        {"name": "Transfer", "icon": "🔄"},
        {"name": "Investment", "icon": "📈"},
    ],
}

INCOME_PARENT = {"name": "Income", "icon": "💰", "order": 1}
INCOME_CHILDREN = [
    {"name": "Salary", "icon": "💰"},
    {"name": "Bonus", "icon": "🎁"},
    {"name": "Freelance", "icon": "💼"},
    {"name": "Investment", "icon": "📈"},
    {"name": "Refund", "icon": "🔄"},
    {"name": "Other", "icon": "📦"},
]


def upgrade() -> None:
    # Create categories table
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon", sa.String(10), nullable=False, server_default="📁"),
        sa.Column("type", sa.String(20), nullable=False, server_default="expense"),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "parent_id", "name", name="uq_category_user_parent_name"),
    )

    # Seed system categories
    conn = op.get_bind()

    # Insert expense parent categories
    for parent in EXPENSE_PARENTS:
        conn.execute(sa.text("""
            INSERT INTO categories (name, icon, type, is_system, display_order)
            VALUES (:name, :icon, 'expense', true, :order)
        """), {"name": parent["name"], "icon": parent["icon"], "order": parent["order"]})

    # Insert expense children
    for parent_name, children in EXPENSE_CHILDREN.items():
        result = conn.execute(sa.text(
            "SELECT id FROM categories WHERE name = :name AND parent_id IS NULL AND is_system = true AND type = 'expense'"
        ), {"name": parent_name})
        parent_id = result.scalar()

        for i, child in enumerate(children):
            conn.execute(sa.text("""
                INSERT INTO categories (name, icon, type, parent_id, is_system, display_order)
                VALUES (:name, :icon, 'expense', :parent_id, true, :order)
            """), {"name": child["name"], "icon": child["icon"], "parent_id": parent_id, "order": i + 1})

    # Insert income parent
    conn.execute(sa.text("""
        INSERT INTO categories (name, icon, type, is_system, display_order)
        VALUES (:name, :icon, 'income', true, :order)
    """), {"name": INCOME_PARENT["name"], "icon": INCOME_PARENT["icon"], "order": INCOME_PARENT["order"]})

    # Insert income children
    result = conn.execute(sa.text(
        "SELECT id FROM categories WHERE name = 'Income' AND parent_id IS NULL AND is_system = true"
    ))
    income_parent_id = result.scalar()

    for i, child in enumerate(INCOME_CHILDREN):
        conn.execute(sa.text("""
            INSERT INTO categories (name, icon, type, parent_id, is_system, display_order)
            VALUES (:name, :icon, 'income', :parent_id, true, :order)
        """), {"name": child["name"], "icon": child["icon"], "parent_id": income_parent_id, "order": i + 1})

    # Migrate existing user_categories to new hierarchy
    migrate_user_categories(conn)


def migrate_user_categories(conn) -> None:
    """Migrate existing user_categories to new hierarchy."""
    # Check if user_categories table exists (database-agnostic)
    dialect_name = conn.dialect.name

    if dialect_name == "sqlite":
        result = conn.execute(sa.text("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='user_categories'
        """))
    else:  # PostgreSQL, MySQL, etc.
        result = conn.execute(sa.text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'user_categories'
        """))

    if not result.scalar():
        return

    # Get all user categories
    user_cats = conn.execute(sa.text(
        "SELECT id, user_id, name, icon, type FROM user_categories"
    )).fetchall()

    for uc in user_cats:
        # Find best parent match
        parent_name = find_parent_for_category(uc.name, uc.type)

        # Get parent ID
        result = conn.execute(sa.text("""
            SELECT id FROM categories
            WHERE name = :name AND parent_id IS NULL AND is_system = true
        """), {"name": parent_name})
        parent_id = result.scalar()

        if not parent_id:
            # Fallback to Other for expense, Income for income
            fallback = "Other" if uc.type == "expense" else "Income"
            result = conn.execute(sa.text("""
                SELECT id FROM categories
                WHERE name = :name AND parent_id IS NULL AND is_system = true
            """), {"name": fallback})
            parent_id = result.scalar()

        # Check if already exists as system child
        result = conn.execute(sa.text("""
            SELECT id FROM categories
            WHERE name = :name AND parent_id = :parent_id AND is_system = true
        """), {"name": uc.name, "parent_id": parent_id})
        existing = result.scalar()

        if not existing:
            # Check if user already has this custom child
            result = conn.execute(sa.text("""
                SELECT id FROM categories
                WHERE name = :name AND parent_id = :parent_id AND user_id = :user_id
            """), {"name": uc.name, "parent_id": parent_id, "user_id": uc.user_id})
            user_existing = result.scalar()

            if not user_existing:
                # Insert as user custom child
                conn.execute(sa.text("""
                    INSERT INTO categories (name, icon, type, parent_id, is_system, user_id, display_order)
                    VALUES (:name, :icon, :type, :parent_id, false, :user_id, 99)
                """), {
                    "name": uc.name,
                    "icon": uc.icon,
                    "type": uc.type,
                    "parent_id": parent_id,
                    "user_id": uc.user_id
                })


def find_parent_for_category(name: str, cat_type: str) -> str:
    """Find best parent category for a given category name."""
    if cat_type == "income":
        return "Income"

    name_lower = name.lower()

    # Food related
    if any(w in name_lower for w in ["food", "eat", "restaurant", "coffee", "lunch", "dinner", "grocery", "cafe", "meal"]):
        return "Food"
    # Housing related
    if any(w in name_lower for w in ["rent", "house", "electric", "water", "gas", "utility", "home"]):
        return "Housing"
    # Transport related
    if any(w in name_lower for w in ["train", "bus", "taxi", "car", "gas", "transport", "uber", "lyft"]):
        return "Transportation"
    # Entertainment related
    if any(w in name_lower for w in ["movie", "game", "netflix", "spotify", "music", "fun", "hobby"]):
        return "Entertainment"
    # Shopping related
    if any(w in name_lower for w in ["cloth", "amazon", "shop", "buy", "store"]):
        return "Shopping"
    # Health related
    if any(w in name_lower for w in ["doctor", "medicine", "gym", "health", "medical", "pharmacy"]):
        return "Health"
    # Communication related
    if any(w in name_lower for w in ["phone", "internet", "mobile", "data"]):
        return "Communication"

    return "Other"


def downgrade() -> None:
    op.drop_table("categories")
