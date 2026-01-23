"""
Achievement initializer with comprehensive achievement list
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models.gamification import Achievement


class AchievementInitializer:
    """Initialize all achievements for the gamification system"""

    @staticmethod
    def get_all_achievements() -> List[Dict[str, Any]]:
        """Get complete list of achievements"""
        achievements = []

        # Savings Achievements
        achievements.extend(
            [
                {
                    "code": "first_penny",
                    "name": "First Penny",
                    "description": "Save your first ¥1",
                    "category": "savings",
                    "xp_reward": 10,
                    "icon": "🪙",
                    "rarity": "common",
                    "trigger_type": "balance_reached",
                    "trigger_value": 1,
                    "order_index": 1,
                },
                {
                    "code": "first_1k",
                    "name": "Thousand Club",
                    "description": "Save ¥1,000",
                    "category": "savings",
                    "xp_reward": 25,
                    "icon": "💵",
                    "rarity": "common",
                    "trigger_type": "balance_reached",
                    "trigger_value": 1000,
                    "order_index": 2,
                },
                {
                    "code": "first_10k",
                    "name": "Five Figures",
                    "description": "Save ¥10,000",
                    "category": "savings",
                    "xp_reward": 100,
                    "icon": "💰",
                    "rarity": "common",
                    "trigger_type": "balance_reached",
                    "trigger_value": 10000,
                    "order_index": 3,
                },
                {
                    "code": "first_100k",
                    "name": "Six Figures",
                    "description": "Save ¥100,000",
                    "category": "savings",
                    "xp_reward": 500,
                    "icon": "💎",
                    "rarity": "rare",
                    "trigger_type": "balance_reached",
                    "trigger_value": 100000,
                    "order_index": 4,
                },
                {
                    "code": "half_million",
                    "name": "Half Millionaire",
                    "description": "Save ¥500,000",
                    "category": "savings",
                    "xp_reward": 1000,
                    "icon": "🏆",
                    "rarity": "epic",
                    "trigger_type": "balance_reached",
                    "trigger_value": 500000,
                    "order_index": 5,
                },
                {
                    "code": "millionaire",
                    "name": "Millionaire",
                    "description": "Save ¥1,000,000",
                    "category": "savings",
                    "xp_reward": 5000,
                    "icon": "👑",
                    "rarity": "legendary",
                    "trigger_type": "balance_reached",
                    "trigger_value": 1000000,
                    "order_index": 6,
                },
                {
                    "code": "emergency_fund",
                    "name": "Safety Net",
                    "description": "Save 3 months of expenses",
                    "category": "savings",
                    "xp_reward": 1000,
                    "icon": "🛡️",
                    "rarity": "epic",
                    "trigger_type": "emergency_fund",
                    "trigger_value": 3,
                    "order_index": 10,
                },
                {
                    "code": "rainy_day",
                    "name": "Rainy Day Fund",
                    "description": "Save 1 month of expenses",
                    "category": "savings",
                    "xp_reward": 300,
                    "icon": "☔",
                    "rarity": "rare",
                    "trigger_type": "emergency_fund",
                    "trigger_value": 1,
                    "order_index": 9,
                },
            ]
        )

        # Streak Achievements
        achievements.extend(
            [
                {
                    "code": "first_login",
                    "name": "Welcome!",
                    "description": "Log in for the first time",
                    "category": "consistency",
                    "xp_reward": 10,
                    "icon": "👋",
                    "rarity": "common",
                    "trigger_type": "first_action",
                    "trigger_value": 1,
                    "order_index": 1,
                },
                {
                    "code": "three_day_streak",
                    "name": "Getting Started",
                    "description": "3 day login streak",
                    "category": "consistency",
                    "xp_reward": 25,
                    "icon": "✨",
                    "rarity": "common",
                    "trigger_type": "streak_days",
                    "trigger_value": 3,
                    "order_index": 2,
                },
                {
                    "code": "week_warrior",
                    "name": "Week Warrior",
                    "description": "7 day login streak",
                    "category": "consistency",
                    "xp_reward": 50,
                    "icon": "🔥",
                    "rarity": "common",
                    "trigger_type": "streak_days",
                    "trigger_value": 7,
                    "order_index": 3,
                },
                {
                    "code": "fortnight_fighter",
                    "name": "Fortnight Fighter",
                    "description": "14 day login streak",
                    "category": "consistency",
                    "xp_reward": 100,
                    "icon": "⚔️",
                    "rarity": "rare",
                    "trigger_type": "streak_days",
                    "trigger_value": 14,
                    "order_index": 4,
                },
                {
                    "code": "month_master",
                    "name": "Monthly Master",
                    "description": "30 day login streak",
                    "category": "consistency",
                    "xp_reward": 300,
                    "icon": "⚡",
                    "rarity": "rare",
                    "trigger_type": "streak_days",
                    "trigger_value": 30,
                    "order_index": 5,
                },
                {
                    "code": "quarter_queen",
                    "name": "Quarter Queen",
                    "description": "90 day login streak",
                    "category": "consistency",
                    "xp_reward": 750,
                    "icon": "👸",
                    "rarity": "epic",
                    "trigger_type": "streak_days",
                    "trigger_value": 90,
                    "order_index": 6,
                },
                {
                    "code": "half_year_hero",
                    "name": "Half Year Hero",
                    "description": "180 day login streak",
                    "category": "consistency",
                    "xp_reward": 1500,
                    "icon": "🦸",
                    "rarity": "epic",
                    "trigger_type": "streak_days",
                    "trigger_value": 180,
                    "order_index": 7,
                },
                {
                    "code": "year_dedication",
                    "name": "Year of Dedication",
                    "description": "365 day login streak",
                    "category": "consistency",
                    "xp_reward": 5000,
                    "icon": "🌟",
                    "rarity": "legendary",
                    "trigger_type": "streak_days",
                    "trigger_value": 365,
                    "order_index": 8,
                },
            ]
        )

        # Transaction Achievements
        achievements.extend(
            [
                {
                    "code": "first_transaction",
                    "name": "First Step",
                    "description": "Log your first transaction",
                    "category": "tracking",
                    "xp_reward": 20,
                    "icon": "👣",
                    "rarity": "common",
                    "trigger_type": "transaction_count",
                    "trigger_value": 1,
                    "order_index": 1,
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
                    "order_index": 2,
                },
                {
                    "code": "regular_tracker",
                    "name": "Regular Tracker",
                    "description": "Log 50 transactions",
                    "category": "tracking",
                    "xp_reward": 100,
                    "icon": "📊",
                    "rarity": "common",
                    "trigger_type": "transaction_count",
                    "trigger_value": 50,
                    "order_index": 3,
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
                    "order_index": 4,
                },
                {
                    "code": "transaction_master",
                    "name": "Transaction Master",
                    "description": "Log 500 transactions",
                    "category": "tracking",
                    "xp_reward": 500,
                    "icon": "🎖️",
                    "rarity": "rare",
                    "trigger_type": "transaction_count",
                    "trigger_value": 500,
                    "order_index": 5,
                },
                {
                    "code": "transaction_legend",
                    "name": "Transaction Legend",
                    "description": "Log 1000 transactions",
                    "category": "tracking",
                    "xp_reward": 1000,
                    "icon": "🏅",
                    "rarity": "epic",
                    "trigger_type": "transaction_count",
                    "trigger_value": 1000,
                    "order_index": 6,
                },
                {
                    "code": "data_enthusiast",
                    "name": "Data Enthusiast",
                    "description": "Log 5000 transactions",
                    "category": "tracking",
                    "xp_reward": 2500,
                    "icon": "📈",
                    "rarity": "epic",
                    "trigger_type": "transaction_count",
                    "trigger_value": 5000,
                    "order_index": 7,
                },
                {
                    "code": "transaction_god",
                    "name": "Transaction God",
                    "description": "Log 10000 transactions",
                    "category": "tracking",
                    "xp_reward": 5000,
                    "icon": "⚡",
                    "rarity": "legendary",
                    "trigger_type": "transaction_count",
                    "trigger_value": 10000,
                    "order_index": 8,
                },
            ]
        )

        # Budget Achievements
        achievements.extend(
            [
                {
                    "code": "budget_creator",
                    "name": "Budget Creator",
                    "description": "Create your first budget",
                    "category": "budgeting",
                    "xp_reward": 50,
                    "icon": "📋",
                    "rarity": "common",
                    "trigger_type": "budget_created",
                    "trigger_value": 1,
                    "order_index": 1,
                },
                {
                    "code": "budget_keeper",
                    "name": "Budget Keeper",
                    "description": "Stay under budget for a month",
                    "category": "budgeting",
                    "xp_reward": 200,
                    "icon": "✅",
                    "rarity": "rare",
                    "trigger_type": "budget_met",
                    "trigger_value": 1,
                    "order_index": 2,
                },
                {
                    "code": "budget_streak_3",
                    "name": "Budget Streak",
                    "description": "Stay under budget for 3 months",
                    "category": "budgeting",
                    "xp_reward": 500,
                    "icon": "🎯",
                    "rarity": "rare",
                    "trigger_type": "budget_met_streak",
                    "trigger_value": 3,
                    "order_index": 3,
                },
                {
                    "code": "budget_streak_6",
                    "name": "Budget Champion",
                    "description": "Stay under budget for 6 months",
                    "category": "budgeting",
                    "xp_reward": 1000,
                    "icon": "🏆",
                    "rarity": "epic",
                    "trigger_type": "budget_met_streak",
                    "trigger_value": 6,
                    "order_index": 4,
                },
                {
                    "code": "budget_master",
                    "name": "Budget Master",
                    "description": "Stay under budget for 12 months",
                    "category": "budgeting",
                    "xp_reward": 2500,
                    "icon": "👑",
                    "rarity": "legendary",
                    "trigger_type": "budget_met_streak",
                    "trigger_value": 12,
                    "order_index": 5,
                },
                {
                    "code": "frugal_living",
                    "name": "Frugal Living",
                    "description": "Spend 50% less than budget",
                    "category": "budgeting",
                    "xp_reward": 300,
                    "icon": "🌱",
                    "rarity": "rare",
                    "trigger_type": "budget_under",
                    "trigger_value": 50,
                    "order_index": 6,
                },
            ]
        )

        # Goal Achievements
        achievements.extend(
            [
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
                    "order_index": 1,
                },
                {
                    "code": "goal_achiever",
                    "name": "Goal Achiever",
                    "description": "Complete your first goal",
                    "category": "goals",
                    "xp_reward": 500,
                    "icon": "🎉",
                    "rarity": "rare",
                    "trigger_type": "goal_completed",
                    "trigger_value": 1,
                    "order_index": 2,
                },
                {
                    "code": "multi_goal",
                    "name": "Multi-Tasker",
                    "description": "Have 3 active goals",
                    "category": "goals",
                    "xp_reward": 150,
                    "icon": "🎪",
                    "rarity": "rare",
                    "trigger_type": "active_goals",
                    "trigger_value": 3,
                    "order_index": 3,
                },
                {
                    "code": "goal_master",
                    "name": "Goal Master",
                    "description": "Complete 5 goals",
                    "category": "goals",
                    "xp_reward": 1500,
                    "icon": "🏅",
                    "rarity": "epic",
                    "trigger_type": "goal_completed",
                    "trigger_value": 5,
                    "order_index": 4,
                },
                {
                    "code": "ambitious",
                    "name": "Ambitious",
                    "description": "Set a goal over ¥1,000,000",
                    "category": "goals",
                    "xp_reward": 200,
                    "icon": "🚀",
                    "rarity": "rare",
                    "trigger_type": "goal_amount",
                    "trigger_value": 1000000,
                    "order_index": 5,
                },
            ]
        )

        # Special/Secret Achievements
        achievements.extend(
            [
                {
                    "code": "night_owl",
                    "name": "Night Owl",
                    "description": "Log transactions after midnight",
                    "category": "special",
                    "xp_reward": 50,
                    "icon": "🦉",
                    "rarity": "rare",
                    "trigger_type": "time_based",
                    "trigger_value": 0,
                    "order_index": 100,
                    "is_secret": True,
                },
                {
                    "code": "early_bird",
                    "name": "Early Bird",
                    "description": "Log transactions before 6 AM",
                    "category": "special",
                    "xp_reward": 50,
                    "icon": "🐦",
                    "rarity": "rare",
                    "trigger_type": "time_based",
                    "trigger_value": 6,
                    "order_index": 101,
                    "is_secret": True,
                },
                {
                    "code": "weekend_warrior",
                    "name": "Weekend Warrior",
                    "description": "Log transactions every weekend for a month",
                    "category": "special",
                    "xp_reward": 100,
                    "icon": "🗓️",
                    "rarity": "rare",
                    "trigger_type": "weekend_activity",
                    "trigger_value": 4,
                    "order_index": 102,
                    "is_secret": True,
                },
                {
                    "code": "perfect_month",
                    "name": "Perfect Month",
                    "description": "Log transactions every day for a month",
                    "category": "special",
                    "xp_reward": 500,
                    "icon": "⭐",
                    "rarity": "epic",
                    "trigger_type": "daily_activity",
                    "trigger_value": 30,
                    "order_index": 103,
                    "is_secret": True,
                },
                {
                    "code": "big_spender",
                    "name": "Big Spender",
                    "description": "Log a transaction over ¥100,000",
                    "category": "special",
                    "xp_reward": 100,
                    "icon": "💸",
                    "rarity": "rare",
                    "trigger_type": "single_transaction",
                    "trigger_value": 100000,
                    "order_index": 104,
                    "is_secret": True,
                },
                {
                    "code": "penny_pincher",
                    "name": "Penny Pincher",
                    "description": "Log 100 transactions under ¥100",
                    "category": "special",
                    "xp_reward": 200,
                    "icon": "🪙",
                    "rarity": "rare",
                    "trigger_type": "small_transactions",
                    "trigger_value": 100,
                    "order_index": 105,
                    "is_secret": True,
                },
            ]
        )

        # Category-specific Achievements
        achievements.extend(
            [
                {
                    "code": "food_tracker",
                    "name": "Food Tracker",
                    "description": "Log 50 food transactions",
                    "category": "categories",
                    "xp_reward": 75,
                    "icon": "🍔",
                    "rarity": "common",
                    "trigger_type": "category_count",
                    "trigger_value": 50,
                    "order_index": 1,
                },
                {
                    "code": "transport_tracker",
                    "name": "Transport Tracker",
                    "description": "Log 50 transport transactions",
                    "category": "categories",
                    "xp_reward": 75,
                    "icon": "🚗",
                    "rarity": "common",
                    "trigger_type": "category_count",
                    "trigger_value": 50,
                    "order_index": 2,
                },
                {
                    "code": "entertainment_tracker",
                    "name": "Entertainment Tracker",
                    "description": "Log 50 entertainment transactions",
                    "category": "categories",
                    "xp_reward": 75,
                    "icon": "🎮",
                    "rarity": "common",
                    "trigger_type": "category_count",
                    "trigger_value": 50,
                    "order_index": 3,
                },
                {
                    "code": "shopping_tracker",
                    "name": "Shopping Tracker",
                    "description": "Log 50 shopping transactions",
                    "category": "categories",
                    "xp_reward": 75,
                    "icon": "🛍️",
                    "rarity": "common",
                    "trigger_type": "category_count",
                    "trigger_value": 50,
                    "order_index": 4,
                },
            ]
        )

        return achievements

    @staticmethod
    def initialize_all_achievements(db: Session):
        """Initialize all achievements in the database"""
        achievements = AchievementInitializer.get_all_achievements()

        for achievement_data in achievements:
            # Check if achievement already exists
            existing = db.query(Achievement).filter_by(code=achievement_data["code"]).first()
            if not existing:
                # Set default values for new columns
                if "is_secret" not in achievement_data:
                    achievement_data["is_secret"] = False
                if "order_index" not in achievement_data:
                    achievement_data["order_index"] = 999

                achievement = Achievement(**achievement_data)
                db.add(achievement)

        db.commit()
        return len(achievements)
