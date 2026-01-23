"""
Challenge models for gamification system
"""

from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Date,
    Boolean,
    Float,
)
from sqlalchemy.orm import relationship
from ..models.transaction import Base


class Challenge(Base):
    """Challenge definitions"""

    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(20), nullable=False)  # 'daily', 'weekly', 'monthly', 'special'
    category = Column(String(50), nullable=True)
    xp_reward = Column(Integer, default=0, nullable=False)
    icon = Column(String(10), nullable=True)
    requirements = Column(JSON, nullable=True)  # {"action": "transaction_created", "count": 3}
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user_challenges = relationship("UserChallenge", back_populates="challenge")

    def is_available(self) -> bool:
        """Check if challenge is currently available"""
        if not self.is_active:
            return False

        today = date.today()
        if self.start_date and today < self.start_date:
            return False
        if self.end_date and today > self.end_date:
            return False

        return True


class UserChallenge(Base):
    """Track user progress on challenges"""

    __tablename__ = "user_challenges"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    progress = Column(Integer, default=0, nullable=False)
    target = Column(Integer, default=1, nullable=False)
    status = Column(
        String(20), default="active", nullable=False
    )  # 'active', 'completed', 'expired', 'failed'

    # Relationships
    challenge = relationship("Challenge", back_populates="user_challenges")

    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage"""
        if self.target == 0:
            return 100.0
        return min(100.0, (self.progress / self.target) * 100)

    def is_completed(self) -> bool:
        """Check if challenge is completed"""
        return self.status == "completed" or self.progress >= self.target


class XPMultiplier(Base):
    """XP multiplier events for special occasions"""

    __tablename__ = "xp_multipliers"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    multiplier = Column(Float, default=1.0, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    action_types = Column(JSON, nullable=True)  # List of affected action types, None = all
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def is_currently_active(self) -> bool:
        """Check if multiplier is currently active"""
        if not self.is_active:
            return False

        now = datetime.utcnow()
        return self.start_date <= now <= self.end_date

    def applies_to_action(self, action: str) -> bool:
        """Check if multiplier applies to a specific action"""
        if not self.is_currently_active():
            return False

        # If no specific action types, applies to all
        if not self.action_types:
            return True

        return action in self.action_types
