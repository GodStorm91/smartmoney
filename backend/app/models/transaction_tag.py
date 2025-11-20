"""TransactionTag database model - junction table for many-to-many relationship."""
from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .transaction import Base


class TransactionTag(Base):
    """Junction table for Transaction-Tag many-to-many relationship."""

    __tablename__ = "transaction_tags"

    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
