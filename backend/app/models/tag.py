"""Tag database model."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base


class Tag(Base):
    """Tag model for flexible transaction labeling."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)  # hex color like #FF5733
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Foreign Keys
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Relationships
    # Note: The Transaction.tags relationship is currently disabled
    # transactions: Mapped[list["Transaction"]] = relationship(
    #     "Transaction", secondary="transaction_tags", back_populates="tags", lazy="select"
    # )
