"""Category model with hierarchical support."""
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .transaction import Base


class Category(Base):
    """Hierarchical category for transactions and budgets.

    Parent categories (parent_id=NULL) are used for budgeting.
    Child categories (parent_id set) are used for transaction tagging.
    System categories are shared by all users.
    Custom categories belong to specific users.
    """

    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("user_id", "parent_id", "name", name="uq_category_user_parent_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=False, default="📁")
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="expense")

    # Hierarchy - NULL for parent categories, set for children
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Ownership - is_system=True for default categories, False for user-created
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Self-referential relationships
    parent: Mapped["Category | None"] = relationship(
        "Category", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Category"]] = relationship(
        "Category", back_populates="parent", cascade="all, delete-orphan"
    )
