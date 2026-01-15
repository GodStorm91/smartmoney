"""
Gamification service for managing XP, achievements, and streaks
"""

from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.gamification import UserGamification, Achievement, UserAchievement, XPEvent
from app.models.user import User


class GamificationService:
    """Service for managing gamification features"""

    # XP values for different actions
    XP_VALUES = {
        "daily_login": 10,
        "transaction_created": 5,
        "transaction_categorized": 3,
        "budget_created": 25,
        "budget_met": 50,
        "goal_created": 30,
        "goal_milestone": 100,
        "receipt_uploaded": 15,
        "weekly_review": 25,
        "first_transaction": 20,  # Bonus for first-time actions
        "first_budget": 50,
        "first_goal": 50,
    }

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_user_gamification(self, user_id: int) -> UserGamification:
        """Get or create user gamification record"""
        user_gamification = self.db.query(UserGamification).filter_by(user_id=user_id).first()

        if not user_gamification:
            user_gamification = UserGamification(user_id=user_id)
            self.db.add(user_gamification)
            self.db.commit()
            self.db.refresh(user_gamification)

        return user_gamification

    def award_xp(
        self, user_id: int, action: str, metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Award XP to user for an action"""
        user_gamification = self.get_or_create_user_gamification(user_id)

        # Get base XP for action
        base_xp = self.XP_VALUES.get(action, 0)
        if base_xp == 0:
            return {"xp_earned": 0, "total_xp": user_gamification.total_xp}

        # Apply multipliers (e.g., streak bonus)
        multiplier = 1.0
        if user_gamification.current_streak >= 7:
            multiplier += 0.1 * (user_gamification.current_streak // 7)  # 10% bonus per week

        xp_earned = int(base_xp * multiplier)

        # Update user's total XP
        old_level = user_gamification.calculate_level()
        user_gamification.total_xp += xp_earned
        new_level = user_gamification.calculate_level()

        # Check for level up
        level_up = None
        if new_level > old_level:
            user_gamification.current_level = new_level
            level_up = {
                "old_level": old_level,
                "new_level": new_level,
                "unlocks": self.get_level_unlocks(new_level),
            }

        # Record XP event
        xp_event = XPEvent(
            user_id=user_id, action=action, xp_earned=xp_earned, event_metadata=metadata
        )
        self.db.add(xp_event)

        self.db.commit()

        return {
            "xp_earned": xp_earned,
            "total_xp": user_gamification.total_xp,
            "current_level": new_level,
            "xp_to_next_level": user_gamification.xp_to_next_level(),
            "level_up": level_up,
        }

    def update_login_streak(self, user_id: int) -> Dict[str, Any]:
        """Update user's login streak"""
        user_gamification = self.get_or_create_user_gamification(user_id)
        today = date.today()

        # Check if this is a new day login
        if user_gamification.last_login_date == today:
            return {"streak_updated": False, "current_streak": user_gamification.current_streak}

        # Check if streak continues or breaks
        if user_gamification.last_login_date:
            days_diff = (today - user_gamification.last_login_date).days

            if days_diff == 1:
                # Streak continues
                user_gamification.current_streak += 1
            elif days_diff > 1:
                # Streak broken
                user_gamification.current_streak = 1
        else:
            # First login
            user_gamification.current_streak = 1

        # Update longest streak if needed
        if user_gamification.current_streak > user_gamification.longest_streak:
            user_gamification.longest_streak = user_gamification.current_streak

        user_gamification.last_login_date = today
        self.db.commit()

        # Award XP for daily login
        xp_result = self.award_xp(user_id, "daily_login")

        # Check streak achievements
        achievements = self.check_streak_achievements(user_id, user_gamification.current_streak)

        return {
            "streak_updated": True,
            "current_streak": user_gamification.current_streak,
            "longest_streak": user_gamification.longest_streak,
            "xp_earned": xp_result["xp_earned"],
            "achievements_unlocked": achievements,
        }

    def check_and_unlock_achievement(
        self, user_id: int, achievement_code: str, progress: int = 100
    ) -> Optional[Dict]:
        """Check and unlock an achievement for a user"""
        # Check if achievement exists
        achievement = self.db.query(Achievement).filter_by(code=achievement_code).first()
        if not achievement:
            return None

        # Check if already unlocked
        user_achievement = (
            self.db.query(UserAchievement)
            .filter_by(user_id=user_id, achievement_id=achievement.id)
            .first()
        )

        if user_achievement and user_achievement.progress >= 100:
            return None  # Already unlocked

        if not user_achievement:
            user_achievement = UserAchievement(
                user_id=user_id, achievement_id=achievement.id, progress=progress
            )
            self.db.add(user_achievement)
        else:
            user_achievement.progress = progress

        # If achievement is complete, award XP
        if progress >= 100:
            user_achievement.unlocked_at = datetime.utcnow()
            self.award_xp(
                user_id, f"achievement_{achievement_code}", {"achievement": achievement.name}
            )

            self.db.commit()

            return {
                "id": achievement.id,
                "code": achievement.code,
                "name": achievement.name,
                "description": achievement.description,
                "xp_reward": achievement.xp_reward,
                "icon": achievement.icon,
                "rarity": achievement.rarity,
            }

        self.db.commit()
        return None

    def check_streak_achievements(self, user_id: int, streak: int) -> List[Dict]:
        """Check for streak-based achievements"""
        unlocked = []

        # Define streak milestones
        streak_achievements = [
            (7, "week_warrior"),
            (30, "month_master"),
            (100, "century_streak"),
            (365, "year_dedication"),
        ]

        for days, achievement_code in streak_achievements:
            if streak >= days:
                achievement = self.check_and_unlock_achievement(user_id, achievement_code)
                if achievement:
                    unlocked.append(achievement)

        return unlocked

    def check_transaction_achievements(self, user_id: int, transaction_count: int) -> List[Dict]:
        """Check for transaction-based achievements"""
        unlocked = []

        # Define transaction milestones
        transaction_achievements = [
            (1, "first_transaction"),
            (10, "getting_started"),
            (50, "regular_tracker"),
            (100, "transaction_centurion"),
            (500, "transaction_master"),
            (1000, "transaction_legend"),
        ]

        for count, achievement_code in transaction_achievements:
            if transaction_count >= count:
                achievement = self.check_and_unlock_achievement(user_id, achievement_code)
                if achievement:
                    unlocked.append(achievement)

        return unlocked

    def check_savings_achievements(self, user_id: int, total_savings: float) -> List[Dict]:
        """Check for savings-based achievements"""
        unlocked = []

        # Define savings milestones (in base currency units)
        savings_achievements = [
            (10000, "first_10k"),
            (100000, "first_100k"),
            (500000, "half_million"),
            (1000000, "millionaire"),
            (5000000, "multi_millionaire"),
        ]

        for amount, achievement_code in savings_achievements:
            if total_savings >= amount:
                achievement = self.check_and_unlock_achievement(user_id, achievement_code)
                if achievement:
                    unlocked.append(achievement)

        return unlocked

    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive gamification stats for a user"""
        user_gamification = self.get_or_create_user_gamification(user_id)

        # Get unlocked achievements
        unlocked_achievements = (
            self.db.query(UserAchievement).filter_by(user_id=user_id, progress=100).all()
        )

        # Get total achievements
        total_achievements = self.db.query(Achievement).count()

        # Get recent XP events
        recent_xp = (
            self.db.query(XPEvent)
            .filter_by(user_id=user_id)
            .order_by(XPEvent.created_at.desc())
            .limit(10)
            .all()
        )

        return {
            "total_xp": user_gamification.total_xp,
            "current_level": user_gamification.current_level,
            "xp_to_next_level": user_gamification.xp_to_next_level(),
            "current_streak": user_gamification.current_streak,
            "longest_streak": user_gamification.longest_streak,
            "achievements_unlocked": len(unlocked_achievements),
            "achievements_total": total_achievements,
            "recent_xp_events": [
                {
                    "action": event.action,
                    "xp_earned": event.xp_earned,
                    "timestamp": event.created_at.isoformat(),
                }
                for event in recent_xp
            ],
        }

    def get_level_unlocks(self, level: int) -> List[str]:
        """Get features/rewards unlocked at a specific level"""
        unlocks = {
            5: ["Custom Categories", "Dark Theme Pro"],
            10: ["Advanced Analytics", "Export to Excel"],
            15: ["AI Insights", "Budget Templates"],
            20: ["Investment Tracking", "Tax Reports"],
            25: ["API Access", "Priority Support"],
            30: ["Beta Features", "Custom Themes"],
        }

        return unlocks.get(level, [])

    def initialize_basic_achievements(self):
        """Initialize the basic 10 achievements for Phase 1"""
        basic_achievements = [
            # Streak achievements
            {
                "code": "week_warrior",
                "name": "Week Warrior",
                "description": "Log in 7 days in a row",
                "category": "consistency",
                "xp_reward": 50,
                "icon": "🔥",
                "rarity": "common",
                "trigger_type": "streak_days",
                "trigger_value": 7,
            },
            {
                "code": "month_master",
                "name": "Monthly Master",
                "description": "Log in 30 days in a row",
                "category": "consistency",
                "xp_reward": 300,
                "icon": "⚡",
                "rarity": "rare",
                "trigger_type": "streak_days",
                "trigger_value": 30,
            },
            # Transaction achievements
            {
                "code": "first_transaction",
                "name": "First Step",
                "description": "Log your first transaction",
                "category": "getting_started",
                "xp_reward": 20,
                "icon": "🎯",
                "rarity": "common",
                "trigger_type": "transaction_count",
                "trigger_value": 1,
            },
            {
                "code": "getting_started",
                "name": "Getting Started",
                "description": "Log 10 transactions",
                "category": "tracking",
                "xp_reward": 50,
                "icon": "📝",
                "rarity": "common",
                "trigger_type": "transaction_count",
                "trigger_value": 10,
            },
            {
                "code": "transaction_centurion",
                "name": "Centurion",
                "description": "Log 100 transactions",
                "category": "tracking",
                "xp_reward": 200,
                "icon": "💯",
                "rarity": "rare",
                "trigger_type": "transaction_count",
                "trigger_value": 100,
            },
            # Savings achievements
            {
                "code": "first_10k",
                "name": "First 10K",
                "description": "Save your first ¥10,000",
                "category": "savings",
                "xp_reward": 100,
                "icon": "💰",
                "rarity": "common",
                "trigger_type": "balance_reached",
                "trigger_value": 10000,
            },
            {
                "code": "first_100k",
                "name": "Six Figures",
                "description": "Reach ¥100,000 in savings",
                "category": "savings",
                "xp_reward": 500,
                "icon": "💎",
                "rarity": "rare",
                "trigger_type": "balance_reached",
                "trigger_value": 100000,
            },
            # Budget achievements
            {
                "code": "budget_creator",
                "name": "Budget Creator",
                "description": "Create your first budget",
                "category": "budgeting",
                "xp_reward": 50,
                "icon": "📊",
                "rarity": "common",
                "trigger_type": "budget_created",
                "trigger_value": 1,
            },
            {
                "code": "budget_keeper",
                "name": "Budget Keeper",
                "description": "Stay under budget for a month",
                "category": "budgeting",
                "xp_reward": 200,
                "icon": "🎯",
                "rarity": "rare",
                "trigger_type": "budget_met",
                "trigger_value": 1,
            },
            # Goal achievement
            {
                "code": "goal_setter",
                "name": "Goal Setter",
                "description": "Create your first savings goal",
                "category": "goals",
                "xp_reward": 50,
                "icon": "🎯",
                "rarity": "common",
                "trigger_type": "goal_created",
                "trigger_value": 1,
            },
        ]

        for achievement_data in basic_achievements:
            # Check if achievement already exists
            existing = self.db.query(Achievement).filter_by(code=achievement_data["code"]).first()
            if not existing:
                achievement = Achievement(**achievement_data)
                self.db.add(achievement)

        self.db.commit()
