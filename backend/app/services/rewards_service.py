from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.rewards import (
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
from app.services.gamification_service import GamificationService


class RewardsService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    # Themes
    def get_themes(self, user_level: int = 1) -> List[Theme]:
        return (
            self.db.query(Theme)
            .filter(Theme.is_active == True, Theme.unlock_level <= user_level)
            .order_by(Theme.order_index)
            .all()
        )

    def get_user_themes(self, user_id: int) -> List[Theme]:
        return self.db.query(Theme).join(UserTheme).filter(UserTheme.user_id == user_id).all()

    def unlock_theme(self, user_id: int, theme_id: int, level: int) -> bool:
        existing = self.db.query(UserTheme).filter_by(user_id=user_id, theme_id=theme_id).first()
        if existing:
            return False

        theme = self.db.query(Theme).filter_by(id=theme_id).first()
        if not theme or level < theme.unlock_level:
            return False

        user_theme = UserTheme(user_id=user_id, theme_id=theme_id)
        self.db.add(user_theme)
        self.db.commit()
        return True

    def activate_theme(self, user_id: int, theme_id: int) -> bool:
        user_theme = self.db.query(UserTheme).filter_by(user_id=user_id, theme_id=theme_id).first()
        if not user_theme:
            return False

        # Deactivate all themes
        self.db.query(UserTheme).filter_by(user_id=user_id).update({UserTheme.is_active: False})
        user_theme.is_active = True
        self.db.commit()
        return True

    # Avatars
    def get_avatars(self, user_level: int = 1) -> List[Avatar]:
        return (
            self.db.query(Avatar)
            .filter(Avatar.is_active == True, Avatar.unlock_level <= user_level)
            .order_by(Avatar.order_index)
            .all()
        )

    def get_user_avatars(self, user_id: int) -> List[Avatar]:
        return self.db.query(Avatar).join(UserAvatar).filter(UserAvatar.user_id == user_id).all()

    def unlock_avatar(self, user_id: int, avatar_id: int, level: int) -> bool:
        existing = self.db.query(UserAvatar).filter_by(user_id=user_id, avatar_id=avatar_id).first()
        if existing:
            return False

        avatar = self.db.query(Avatar).filter_by(id=avatar_id).first()
        if not avatar or level < avatar.unlock_level:
            return False

        user_avatar = UserAvatar(user_id=user_id, avatar_id=avatar_id)
        self.db.add(user_avatar)
        self.db.commit()
        return True

    def activate_avatar(self, user_id: int, avatar_id: int) -> bool:
        user_avatar = (
            self.db.query(UserAvatar).filter_by(user_id=user_id, avatar_id=avatar_id).first()
        )
        if not user_avatar:
            return False

        self.db.query(UserAvatar).filter_by(user_id=user_id).update({UserAvatar.is_active: False})
        user_avatar.is_active = True
        self.db.commit()
        return True

    # Profile
    def get_profile(self, user_id: int) -> Optional[UserProfile]:
        return self.db.query(UserProfile).filter_by(user_id=user_id).first()

    def update_profile(
        self, user_id: int, display_name: str, bio: Optional[str] = None
    ) -> UserProfile:
        profile = self.get_profile(user_id)
        if not profile:
            profile = UserProfile(user_id=user_id, display_name=display_name, bio=bio)
            self.db.add(profile)
        else:
            profile.display_name = display_name
            if bio is not None:
                profile.bio = bio
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def set_title(self, user_id: int, title: str) -> bool:
        profile = self.get_profile(user_id)
        if not profile:
            profile = UserProfile(user_id=user_id, title=title)
            self.db.add(profile)
        else:
            profile.title = title
        self.db.commit()
        return True

    # Seasonal Events
    def get_active_event(self) -> Optional[SeasonalEvent]:
        today = date.today()
        return (
            self.db.query(SeasonalEvent)
            .filter(
                SeasonalEvent.is_active == True,
                SeasonalEvent.start_date <= today,
                SeasonalEvent.end_date >= today,
            )
            .first()
        )

    def get_event_multiplier(self) -> float:
        event = self.get_active_event()
        return event.xp_multiplier if event else 1.0

    # Unlockable Features
    def get_unlocked_features(self, user_id: int) -> List[UnlockableFeature]:
        return (
            self.db.query(UnlockableFeature)
            .join(UserUnlockedFeature)
            .filter(UserUnlockedFeature.user_id == user_id)
            .all()
        )

    def check_feature_access(self, user_id: int, feature_code: str) -> bool:
        feature = (
            self.db.query(UnlockableFeature).filter_by(code=feature_code, is_active=True).first()
        )
        if not feature:
            return False

        unlocked = (
            self.db.query(UserUnlockedFeature)
            .filter_by(user_id=user_id, feature_id=feature.id)
            .first()
        )

        if unlocked:
            return True

        user_gamification = self.gamification.get_or_create_user_gamification(user_id)
        level = user_gamification.calculate_level()

        if level >= feature.required_level:
            user_unlocked = UserUnlockedFeature(user_id=user_id, feature_id=feature.id)
            self.db.add(user_unlocked)
            self.db.commit()
            return True

        return False

    # Settings
    def get_settings(self, user_id: int) -> GamificationSettings:
        settings = self.db.query(GamificationSettings).filter_by(user_id=user_id).first()
        if not settings:
            settings = GamificationSettings(user_id=user_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_settings(self, user_id: int, **kwargs) -> GamificationSettings:
        settings = self.get_settings(user_id)
        for key, value in kwargs.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        settings.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(settings)
        return settings

    # Streak Bonuses
    def get_streak_bonus(self, streak_days: int) -> Dict:
        bonus = (
            self.db.query(XPStreakBonus).filter_by(streak_days=streak_days, is_active=True).first()
        )
        if bonus:
            return {"multiplier": bonus.multiplier, "bonus_xp": bonus.bonus_xp}
        return {"multiplier": 1.0, "bonus_xp": 0}

    def calculate_xp_with_bonus(self, user_id: int, base_xp: int) -> Dict:
        user_gamification = self.gamification.get_or_create_user_gamification(user_id)
        streak = user_gamification.current_streak

        bonus = self.get_streak_bonus(streak)
        event_multiplier = self.get_event_multiplier()

        total_multiplier = bonus["multiplier"] * event_multiplier
        final_xp = int(base_xp * total_multiplier) + bonus["bonus_xp"]

        return {
            "base_xp": base_xp,
            "streak_bonus": bonus["multiplier"],
            "event_multiplier": event_multiplier,
            "bonus_xp": bonus["bonus_xp"],
            "total_xp": final_xp,
        }

    # Initialize default data
    def initialize_themes(self):
        themes = [
            {
                "code": "default",
                "name": "Default Blue",
                "type": "color",
                "preview_color": "#3b82f6",
                "unlock_level": 1,
                "icon": "🔵",
            },
            {
                "code": "dark",
                "name": "Dark Mode",
                "type": "color",
                "preview_color": "#1f2937",
                "unlock_level": 1,
                "icon": "🌙",
            },
            {
                "code": "emerald",
                "name": "Emerald Green",
                "type": "color",
                "preview_color": "#10b981",
                "unlock_level": 3,
                "icon": "💚",
            },
            {
                "code": "sunset",
                "name": "Sunset Orange",
                "type": "gradient",
                "preview_color": "#f97316",
                "unlock_level": 5,
                "icon": "🌅",
            },
            {
                "code": "purple",
                "name": "Royal Purple",
                "type": "color",
                "preview_color": "#8b5cf6",
                "unlock_level": 7,
                "icon": "👑",
            },
            {
                "code": "rainbow",
                "name": "Rainbow",
                "type": "gradient",
                "preview_color": "#ec4899",
                "unlock_level": 10,
                "icon": "🌈",
            },
            {
                "code": "gold",
                "name": "Gold Premium",
                "type": "gradient",
                "preview_color": "#fbbf24",
                "unlock_level": 15,
                "icon": "🥇",
                "is_premium": True,
            },
            {
                "code": "neon",
                "name": "Neon Night",
                "type": "gradient",
                "preview_color": "#06b6d4",
                "unlock_level": 20,
                "icon": "✨",
            },
        ]
        for t in themes:
            existing = self.db.query(Theme).filter_by(code=t["code"]).first()
            if not existing:
                self.db.add(Theme(**t))
        self.db.commit()

    def initialize_avatars(self):
        avatars = [
            {
                "code": "default",
                "name": "Default",
                "emoji": "😊",
                "unlock_level": 1,
                "rarity": "common",
            },
            {
                "code": "money",
                "name": "Money Face",
                "emoji": "🤑",
                "unlock_level": 2,
                "rarity": "common",
            },
            {
                "code": "rocket",
                "name": "Rocket",
                "emoji": "🚀",
                "unlock_level": 3,
                "rarity": "common",
            },
            {
                "code": "chart",
                "name": "Chart Up",
                "emoji": "📈",
                "unlock_level": 5,
                "rarity": "rare",
            },
            {
                "code": "trophy",
                "name": "Winner",
                "emoji": "🏆",
                "unlock_level": 7,
                "rarity": "rare",
            },
            {"code": "crown", "name": "King", "emoji": "👑", "unlock_level": 10, "rarity": "epic"},
            {
                "code": "star",
                "name": "Super Star",
                "emoji": "⭐",
                "unlock_level": 15,
                "rarity": "epic",
            },
            {
                "code": "diamond",
                "name": "Diamond",
                "emoji": "💎",
                "unlock_level": 20,
                "rarity": "legendary",
            },
            {
                "code": "fire",
                "name": "On Fire",
                "emoji": "🔥",
                "unlock_level": 25,
                "rarity": "legendary",
            },
            {
                "code": "dragon",
                "name": "Dragon",
                "emoji": "🐉",
                "unlock_level": 30,
                "rarity": "legendary",
            },
        ]
        for a in avatars:
            existing = self.db.query(Avatar).filter_by(code=a["code"]).first()
            if not existing:
                self.db.add(Avatar(**a))
        self.db.commit()

    def initialize_features(self):
        features = [
            {
                "code": "advanced_analytics",
                "name": "Advanced Analytics",
                "description": "Access detailed spending breakdowns",
                "required_level": 10,
                "feature_type": "analytics",
            },
            {
                "code": "export_csv",
                "name": "CSV Export",
                "description": "Export transactions to CSV",
                "required_level": 5,
                "feature_type": "export",
            },
            {
                "code": "export_pdf",
                "name": "PDF Reports",
                "description": "Generate PDF financial reports",
                "required_level": 12,
                "feature_type": "export",
            },
            {
                "code": "custom_budgets",
                "name": "Custom Budgets",
                "description": "Create unlimited custom budgets",
                "required_level": 8,
                "feature_type": "budget",
            },
            {
                "code": "api_access",
                "name": "API Access",
                "description": "Access SmartMoney API",
                "required_level": 20,
                "feature_type": "api",
            },
            {
                "code": "ai_insights",
                "name": "AI Insights",
                "description": "AI-powered financial recommendations",
                "required_level": 15,
                "feature_type": "analytics",
            },
            {
                "code": "tax_reports",
                "name": "Tax Reports",
                "description": "Generate tax preparation reports",
                "required_level": 18,
                "feature_type": "export",
            },
        ]
        for f in features:
            existing = self.db.query(UnlockableFeature).filter_by(code=f["code"]).first()
            if not existing:
                self.db.add(UnlockableFeature(**f))
        self.db.commit()

    def initialize_streak_bonuses(self):
        bonuses = [
            {
                "streak_days": 3,
                "multiplier": 1.1,
                "bonus_xp": 10,
                "description": "1.1x XP for 3-day streak",
            },
            {
                "streak_days": 7,
                "multiplier": 1.25,
                "bonus_xp": 25,
                "description": "1.25x XP for 7-day streak",
            },
            {
                "streak_days": 14,
                "multiplier": 1.5,
                "bonus_xp": 50,
                "description": "1.5x XP for 14-day streak",
            },
            {
                "streak_days": 30,
                "multiplier": 2.0,
                "bonus_xp": 100,
                "description": "2x XP for 30-day streak",
            },
        ]
        for b in bonuses:
            existing = self.db.query(XPStreakBonus).filter_by(streak_days=b["streak_days"]).first()
            if not existing:
                self.db.add(XPStreakBonus(**b))
        self.db.commit()

    def initialize_all(self):
        self.initialize_themes()
        self.initialize_avatars()
        self.initialize_features()
        self.initialize_streak_bonuses()
