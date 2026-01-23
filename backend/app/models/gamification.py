"""
Gamification models for SmartMoney
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Date,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from ..models.transaction import Base


class UserGamification(Base):
    """User gamification stats and progress"""

    __tablename__ = "user_gamification"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    total_xp = Column(Integer, default=0, nullable=False)
    current_level = Column(Integer, default=1, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_login_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships - Disabled due to FK issues (no back references needed)
    # achievements and xp_events are queried directly by user_id

    def calculate_level(self) -> int:
        """Calculate user level based on total XP"""
        # Level progression: Each level requires more XP
        # Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, etc.
        level_thresholds = [
            0,
            100,
            250,
            500,
            1000,
            1750,
            2750,
            4000,
            5500,
            7500,  # Levels 1-10
            10000,
            13000,
            16500,
            20500,
            25000,
            30000,
            36000,
            43000,
            51000,
            60000,  # Levels 11-20
            70000,
            81000,
            93000,
            106000,
            120000,
            135000,
            151000,
            168000,
            186000,
            205000,  # Levels 21-30
        ]

        for level, threshold in enumerate(level_thresholds, 1):
            if self.total_xp < threshold:
                return level - 1

        # For levels beyond 30, use a formula
        return 30 + ((self.total_xp - 205000) // 25000)

    def xp_to_next_level(self) -> int:
        """Calculate XP needed for next level"""
        current_level = self.calculate_level()

        # Define XP requirements for each level
        level_thresholds = [
            0,
            100,
            250,
            500,
            1000,
            1750,
            2750,
            4000,
            5500,
            7500,  # Levels 1-10
            10000,
            13000,
            16500,
            20500,
            25000,
            30000,
            36000,
            43000,
            51000,
            60000,  # Levels 11-20
            70000,
            81000,
            93000,
            106000,
            120000,
            135000,
            151000,
            168000,
            186000,
            205000,  # Levels 21-30
        ]

        if current_level < len(level_thresholds) - 1:
            return level_thresholds[current_level + 1] - self.total_xp
        else:
            # For levels beyond 30
            next_threshold = 205000 + ((current_level - 29) * 25000)
            return next_threshold - self.total_xp


class Achievement(Base):
    """Achievement definitions"""

    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)  # savings, budgeting, consistency, learning
    xp_reward = Column(Integer, default=0, nullable=False)
    icon = Column(String(10), nullable=True)
    rarity = Column(String(20), nullable=True)  # common, rare, epic, legendary
    trigger_type = Column(
        String(50), nullable=True
    )  # balance_reached, transaction_count, streak_days, etc.
    trigger_value = Column(
        Integer, nullable=True
    )  # The value needed to trigger (e.g., 10000 for balance)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships - Disabled (no back references needed)


class UserAchievement(Base):
    """User's unlocked achievements"""

    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    progress = Column(Integer, default=0, nullable=False)  # For progressive achievements

    # Unique constraint to prevent duplicate achievements
    __table_args__ = (UniqueConstraint("user_id", "achievement_id"),)

    # Relationships - Disabled (no back references needed)


class XPEvent(Base):
    """Track XP earning history"""

    __tablename__ = "xp_events"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # login, transaction_created, budget_met, etc.
    xp_earned = Column(Integer, nullable=False)
    event_metadata = Column(JSON, nullable=True)  # Additional context about the event
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships - Disabled (no back references needed)
