"""User credit account model for storing credit balances."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..models.transaction import Base


class UserCredit(Base):
    """User credit account model for tracking credit balance and lifetime statistics."""

    __tablename__ = "user_credits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000")
    )
    lifetime_purchased: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000")
    )
    lifetime_spent: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000")
    )
    last_purchase_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_transaction_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="credit_account")

    # Constraints
    __table_args__ = (
        CheckConstraint("balance >= 0", name="balance_non_negative"),
        CheckConstraint("lifetime_purchased >= 0", name="lifetime_purchased_non_negative"),
        CheckConstraint("lifetime_spent >= 0", name="lifetime_spent_non_negative"),
    )
