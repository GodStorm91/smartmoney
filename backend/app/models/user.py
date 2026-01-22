"""User model for authentication."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..models.transaction import Base

if TYPE_CHECKING:
    from .bill import Bill
    from .receipt import Receipt
    from .dismissed_suggestion import DismissedSuggestion
    from .recurring_transaction import RecurringTransaction
    from .category_rule import CategoryRule
    from .crypto_wallet import CryptoWallet, RewardContract, RewardClaim
    from .notification import InAppNotification, BurnRateAlert
    from .insight import InsightCard, SavingsRecommendation
    from .anomaly import AnomalyAlert, AnomalyConfig
    from .user_credit import UserCredit
    from .credit_purchase import CreditPurchase
    from .credit_transaction import CreditTransaction


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

    # Gamification relationships
    anomaly_alerts: Mapped[list["AnomalyAlert"]] = relationship(
        "AnomalyAlert", back_populates="user", cascade="all, delete-orphan"
    )
    anomaly_config: Mapped["AnomalyConfig"] = relationship(
        "AnomalyConfig", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    # Insight and savings relationships
    insight_cards: Mapped[list["InsightCard"]] = relationship(
        "InsightCard", back_populates="user", cascade="all, delete-orphan"
    )
    savings_recommendations: Mapped[list["SavingsRecommendation"]] = relationship(
        "SavingsRecommendation", back_populates="user", cascade="all, delete-orphan"
    )

    # Bill and receipt relationships
    bills: Mapped[list["Bill"]] = relationship(
        "Bill", back_populates="user", cascade="all, delete-orphan"
    )
    receipts: Mapped[list["Receipt"]] = relationship(
        "Receipt", back_populates="user", cascade="all, delete-orphan"
    )
    dismissed_suggestions: Mapped[list["DismissedSuggestion"]] = relationship(
        "DismissedSuggestion", back_populates="user", cascade="all, delete-orphan"
    )

    # Transaction management relationships
    recurring_transactions: Mapped[list["RecurringTransaction"]] = relationship(
        "RecurringTransaction", back_populates="user", cascade="all, delete-orphan"
    )
    category_rules: Mapped[list["CategoryRule"]] = relationship(
        "CategoryRule", back_populates="user", cascade="all, delete-orphan"
    )

    # Crypto relationships
    crypto_wallets: Mapped[list["CryptoWallet"]] = relationship(
        "CryptoWallet", back_populates="user", cascade="all, delete-orphan"
    )
    reward_contracts: Mapped[list["RewardContract"]] = relationship(
        "RewardContract", back_populates="user", cascade="all, delete-orphan"
    )
    reward_claims: Mapped[list["RewardClaim"]] = relationship(
        "RewardClaim", back_populates="user", cascade="all, delete-orphan"
    )

    # Notification relationships
    in_app_notifications: Mapped[list["InAppNotification"]] = relationship(
        "InAppNotification", back_populates="user", cascade="all, delete-orphan"
    )
    burn_rate_alerts: Mapped[list["BurnRateAlert"]] = relationship(
        "BurnRateAlert", back_populates="user", cascade="all, delete-orphan"
    )
