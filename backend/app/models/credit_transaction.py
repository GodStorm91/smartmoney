"""Credit transaction model for tracking all credit movements."""
from datetime import datetime
from decimal import Decimal
import random
import string
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..models.transaction import Base


class CreditTransaction(Base):
    """Credit transaction model for detailed audit log of all credit operations."""

    __tablename__ = "credit_transactions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # Format: TXN_YYMMDD_XXXXX
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # purchase, usage, refund, adjustment
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False
    )  # Positive for credits, negative for debits
    balance_after: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    extra_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)  # JSON for cross-DB compatibility
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="credit_transactions")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "type IN ('purchase', 'usage', 'refund', 'adjustment')", name="valid_type"
        ),
        CheckConstraint("amount != 0", name="amount_not_zero"),
    )

    @staticmethod
    def generate_id() -> str:
        """Generate unique transaction ID: TXN_YYMMDD_XXXXX"""
        date_str = datetime.utcnow().strftime("%y%m%d")
        random_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"TXN_{date_str}_{random_str}"
