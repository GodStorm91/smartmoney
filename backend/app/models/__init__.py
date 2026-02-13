"""Database models."""

from .account import Account
from .anomaly import AnomalyAlert, AnomalyConfig
from .bill import Bill, BillHistory
from .budget import Budget, BudgetAllocation, BudgetFeedback
from .budget_alert import BudgetAlert
from .category import Category
from .category_rule import CategoryRule
from .challenges import Challenge, UserChallenge, XPMultiplier
from .credit_purchase import CreditPurchase
from .credit_transaction import CreditTransaction
from .crypto_wallet import (
    CryptoWallet,
    RewardContract,
    CryptoSyncState,
    RewardClaim,
    DefiPositionSnapshot,
    PositionReward,
    PositionCostBasis,
)
from .dismissed_suggestion import DismissedSuggestion
from .exchange_rate import ExchangeRate
from .gamification import UserGamification, Achievement, UserAchievement, XPEvent
from .goal import Goal
from .goal_type import GoalType
from .insight import InsightCard, SavingsRecommendation
from .notification import (
    NotificationPreference,
    PushSubscription,
    InAppNotification,
    NotificationLog,
    BillReminderSchedule,
    BurnRateAlert,
    QueuedNotification,
)
from .position_closure import PositionClosure
from .receipt import Receipt
from .report_ai_summary import ReportAISummary
from .recurring_transaction import RecurringTransaction
from .regional_data import (
    PrefectureInsuranceRate,
    RegionalCity,
    RegionalCostIndex,
    RegionalRent,
)
from .rewards import (
    Theme,
    UserTheme,
    Avatar,
    UserAvatar,
    UserProfile,
    SeasonalEvent,
    GamificationSettings,
    UnlockableFeature,
    UserUnlockedFeature,
    XPStreakBonus,
)
from .settings import AppSettings
from .social_learning import (
    Quiz,
    QuizQuestion,
    UserQuizAttempt,
    LearningPath,
    LearningModule,
    UserLearningProgress,
    LeaderboardEntry,
    SocialGroup,
    GroupMember,
    GroupChallenge,
)
from .tag import Tag
from .transaction import Base, Transaction
from .transaction_tag import TransactionTag
from .user import User
from .user_category import UserCategory
from .user_credit import UserCredit

__all__ = [
    "Base",
    "Transaction",
    "Goal",
    "AppSettings",
    "ExchangeRate",
    "Account",
    "Tag",
    "TransactionTag",
    "User",
    "Budget",
    "BudgetAllocation",
    "BudgetFeedback",
    "UserCredit",
    "CreditPurchase",
    "CreditTransaction",
    "Achievement",
    "UserAchievement",
    "XPEvent",
    "UserGamification",
    "Challenge",
    "UserChallenge",
    "XPMultiplier",
    "InsightCard",
    "SavingsRecommendation",
    "NotificationPreference",
    "Theme",
    "UserTheme",
    "Avatar",
    "UserAvatar",
    "UserProfile",
    "SeasonalEvent",
    "GamificationSettings",
    "UnlockableFeature",
    "UserUnlockedFeature",
    "XPStreakBonus",
    "AnomalyAlert",
    "AnomalyConfig",
    "Category",
    "CategoryRule",
    "Bill",
    "BillHistory",
    "BudgetAlert",
    "CryptoWallet",
    "RewardContract",
    "CryptoSyncState",
    "RewardClaim",
    "DefiPositionSnapshot",
    "PositionReward",
    "PositionCostBasis",
    "DismissedSuggestion",
    "GoalType",
    "PositionClosure",
    "Receipt",
    "ReportAISummary",
    "RecurringTransaction",
    "Quiz",
    "QuizQuestion",
    "UserQuizAttempt",
    "LearningPath",
    "LearningModule",
    "UserLearningProgress",
    "LeaderboardEntry",
    "SocialGroup",
    "GroupMember",
    "GroupChallenge",
    "UserCategory",
    "NotificationPreference",
    "PushSubscription",
    "InAppNotification",
    "NotificationLog",
    "BudgetAlert",
    "BillReminderSchedule",
    "BurnRateAlert",
    "QueuedNotification",
    "RegionalCity",
    "RegionalRent",
    "RegionalCostIndex",
    "PrefectureInsuranceRate",
]
