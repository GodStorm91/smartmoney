"""Goal type enumeration."""
from enum import Enum


class GoalType(str, Enum):
    """Goal type enum for categorizing financial goals."""

    EMERGENCY_FUND = "emergency_fund"
    HOME_DOWN_PAYMENT = "home_down_payment"
    VACATION_TRAVEL = "vacation_travel"
    VEHICLE = "vehicle"
    EDUCATION = "education"
    WEDDING = "wedding"
    LARGE_PURCHASE = "large_purchase"
    DEBT_PAYOFF = "debt_payoff"
    RETIREMENT = "retirement"
    INVESTMENT = "investment"
    CUSTOM = "custom"
