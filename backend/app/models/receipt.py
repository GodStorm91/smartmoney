"""Receipt model for storing uploaded receipt images."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .user import User
    from .transaction import Transaction


class Receipt(Base):
    """Model for storing receipt images with OCR data."""

    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # User reference
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Transaction reference (if linked)
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # File info
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # OCR data
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_merchant: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extracted_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Amount in JPY
    extracted_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    extracted_category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Processing status
    is_processed: Mapped[bool] = mapped_column(default=False, nullable=False)
    processing_error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="receipts", lazy="select")
    transaction: Mapped["Transaction | None"] = relationship("Transaction", back_populates="receipt", lazy="select")
