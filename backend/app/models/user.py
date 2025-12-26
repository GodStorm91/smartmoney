"""User model for authentication."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.transaction import Base


class User(Base):
    """User model for authentication and data isolation."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships (will be added when user_id columns are added to other tables)
    # transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    # accounts: Mapped[list["Account"]] = relationship(back_populates="user")
    # goals: Mapped[list["Goal"]] = relationship(back_populates="user")
    # settings: Mapped["AppSettings"] = relationship(back_populates="user", uselist=False)

    # Credit system relationships
    credit_account: Mapped["UserCredit"] = relationship(
        "UserCredit", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    credit_purchases: Mapped[list["CreditPurchase"]] = relationship(
        "CreditPurchase", back_populates="user", cascade="all, delete-orphan"
    )
    credit_transactions: Mapped[list["CreditTransaction"]] = relationship(
        "CreditTransaction", back_populates="user", cascade="all, delete-orphan"
    )

    # Recurring transactions relationship
    recurring_transactions: Mapped[list["RecurringTransaction"]] = relationship(
        "RecurringTransaction", back_populates="user", cascade="all, delete-orphan"
    )

    # Category rules relationship
    category_rules: Mapped[list["CategoryRule"]] = relationship(
        "CategoryRule", back_populates="user", cascade="all, delete-orphan"
    )

    # Crypto wallet relationships
    crypto_wallets: Mapped[list["CryptoWallet"]] = relationship(
        "CryptoWallet", back_populates="user", cascade="all, delete-orphan"
    )
    reward_contracts: Mapped[list["RewardContract"]] = relationship(
        "RewardContract", back_populates="user", cascade="all, delete-orphan"
    )
    reward_claims: Mapped[list["RewardClaim"]] = relationship(
        "RewardClaim", back_populates="user", cascade="all, delete-orphan"
    )
