from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Date,
    Float,
    Boolean,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from ..models.transaction import Base


class Theme(Base):
    __tablename__ = "themes"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    type = Column(String(20), nullable=False)  # 'color', 'gradient', 'image'
    preview_color = Column(String(20))
    css_variables = Column(JSON)
    unlock_level = Column(Integer, default=1)
    icon = Column(String(10))
    is_premium = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)


class UserTheme(Base):
    __tablename__ = "user_themes"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    theme_id = Column(Integer, ForeignKey("themes.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=False)


class Avatar(Base):
    __tablename__ = "avatars"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    emoji = Column(String(10))
    image_url = Column(String(500))
    unlock_level = Column(Integer, default=1)
    rarity = Column(String(20), default="common")  # common, rare, epic, legendary
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)


class UserAvatar(Base):
    __tablename__ = "user_avatars"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    avatar_id = Column(Integer, ForeignKey("avatars.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=False)


class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    display_name = Column(String(100))
    bio = Column(Text)
    title = Column(String(100))  # Earned from achievements
    selected_avatar_id = Column(Integer, ForeignKey("avatars.id"))
    selected_theme_id = Column(Integer, ForeignKey("themes.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class SeasonalEvent(Base):
    __tablename__ = "seasonal_events"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    xp_multiplier = Column(Float, default=1.0)
    special_challenge_code = Column(String(50))
    theme_id = Column(Integer, ForeignKey("themes.id"))
    icon = Column(String(10))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def is_currently_active(self) -> bool:
        today = date.today()
        # Explicitly evaluate to Python booleans
        return (
            bool(self.is_active) and bool(self.start_date <= today) and bool(today <= self.end_date)  # type: ignore[return-value]
        )


class GamificationSettings(Base):
    __tablename__ = "gamification_settings"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    notifications_enabled = Column(Boolean, default=True)
    achievement_notifications = Column(Boolean, default=True)
    streak_reminders = Column(Boolean, default=True)
    challenge_reminders = Column(Boolean, default=True)
    sound_effects = Column(Boolean, default=True)
    show_on_profile = Column(Boolean, default=True)
    share_achievements = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class UnlockableFeature(Base):
    __tablename__ = "unlockable_features"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    required_level = Column(Integer, nullable=False)
    feature_type = Column(String(50), nullable=False)  # 'analytics', 'export', 'api', etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserUnlockedFeature(Base):
    __tablename__ = "user_unlocked_features"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feature_id = Column(Integer, ForeignKey("unlockable_features.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)


class XPStreakBonus(Base):
    __tablename__ = "xp_streak_bonuses"
    id = Column(Integer, primary_key=True)
    streak_days = Column(Integer, nullable=False)
    multiplier = Column(Float, nullable=False)
    bonus_xp = Column(Integer, nullable=False)
    description = Column(String(200))
    is_active = Column(Boolean, default=True)
