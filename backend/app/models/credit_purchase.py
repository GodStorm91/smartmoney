"""Credit purchase model for tracking payment transactions."""
from datetime import datetime
from decimal import Decimal
import random
import string

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..models.transaction import Base


class CreditPurchase(Base):
    """Credit purchase model for tracking payment transactions and status."""

    __tablename__ = "credit_purchases"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # Format: PUR_YYMMDD_XXXXX
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    package: Mapped[str] = mapped_column(String(20), nullable=False)  # starter, basic, standard, premium
    amount_vnd: Mapped[int] = mapped_column(Integer, nullable=False)
    credits: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False)  # bank_transfer, qr_code
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending, completed, failed, expired
    sepay_transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="credit_purchases")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "package IN ('starter', 'basic', 'standard', 'premium')", name="valid_package"
        ),
        CheckConstraint(
            "status IN ('pending', 'completed', 'failed', 'expired')", name="valid_status"
        ),
        CheckConstraint("amount_vnd > 0", name="amount_positive"),
        CheckConstraint("credits > 0", name="credits_positive"),
    )

    @staticmethod
    def generate_id() -> str:
        """Generate unique purchase ID: PUR_YYMMDD_XXXXX"""
        date_str = datetime.utcnow().strftime("%y%m%d")
        random_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"PUR_{date_str}_{random_str}"
