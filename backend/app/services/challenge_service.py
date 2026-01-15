"""
Challenge service for managing daily, weekly, and monthly challenges
"""

from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.challenges import Challenge, UserChallenge, XPMultiplier
from app.services.gamification_service import GamificationService


class ChallengeService:
    """Service for managing challenges"""

    def __init__(self, db: Session):
        self.db = db
        self.gamification_service = GamificationService(db)

    def get_active_challenges(self, challenge_type: Optional[str] = None) -> List[Challenge]:
        """Get all active challenges, optionally filtered by type"""
        query = self.db.query(Challenge).filter(Challenge.is_active == True)

        today = date.today()
        query = query.filter(
            or_(Challenge.start_date == None, Challenge.start_date <= today)
        ).filter(or_(Challenge.end_date == None, Challenge.end_date >= today))

        if challenge_type:
            query = query.filter(Challenge.type == challenge_type)

        return query.all()

    def get_user_challenges(
        self, user_id: int, status: Optional[str] = None
    ) -> List[UserChallenge]:
        """Get user's challenges, optionally filtered by status"""
        query = self.db.query(UserChallenge).filter(UserChallenge.user_id == user_id)

        if status:
            query = query.filter(UserChallenge.status == status)

        return query.all()

    def start_challenge(self, user_id: int, challenge_id: int) -> UserChallenge:
        """Start a challenge for a user"""
        # Check if challenge exists and is active
        challenge = self.db.query(Challenge).filter_by(id=challenge_id).first()
        if not challenge or not challenge.is_available():
            raise ValueError("Challenge not available")

        # Check if user already has this challenge
        existing = (
            self.db.query(UserChallenge)
            .filter_by(user_id=user_id, challenge_id=challenge_id, status="active")
            .first()
        )

        if existing:
            return existing

        # Create new user challenge
        user_challenge = UserChallenge(
            user_id=user_id,
            challenge_id=challenge_id,
            target=challenge.requirements.get("count", 1) if challenge.requirements else 1,
            status="active",
        )

        self.db.add(user_challenge)
        self.db.commit()
        self.db.refresh(user_challenge)

        return user_challenge

    def update_challenge_progress(
        self, user_id: int, action: str, metadata: Optional[Dict] = None
    ) -> List[Dict]:
        """Update progress for all active challenges based on an action"""
        completed_challenges = []

        # Get all active user challenges
        active_challenges = self.get_user_challenges(user_id, status="active")

        for user_challenge in active_challenges:
            challenge = user_challenge.challenge

            # Check if this action matches the challenge requirements
            if self._action_matches_requirements(action, metadata, challenge.requirements):
                # Update progress
                user_challenge.progress += 1

                # Check if challenge is completed
                if user_challenge.progress >= user_challenge.target:
                    user_challenge.status = "completed"
                    user_challenge.completed_at = datetime.utcnow()

                    # Award XP for completing the challenge
                    xp_result = self.gamification_service.award_xp(
                        user_id,
                        f"challenge_completed_{challenge.code}",
                        {"challenge": challenge.name},
                    )

                    # Award the challenge-specific XP
                    if challenge.xp_reward > 0:
                        bonus_xp = self.gamification_service.award_xp(
                            user_id,
                            "challenge_reward",
                            {"challenge": challenge.name, "reward": challenge.xp_reward},
                        )

                    completed_challenges.append(
                        {
                            "id": challenge.id,
                            "code": challenge.code,
                            "name": challenge.name,
                            "xp_reward": challenge.xp_reward,
                            "icon": challenge.icon,
                        }
                    )

        self.db.commit()
        return completed_challenges

    def _action_matches_requirements(
        self, action: str, metadata: Optional[Dict], requirements: Optional[Dict]
    ) -> bool:
        """Check if an action matches challenge requirements"""
        if not requirements:
            return False

        # Check action type
        if "action" in requirements and requirements["action"] != action:
            return False

        # Check category if specified
        if "category" in requirements and metadata:
            if metadata.get("category") != requirements["category"]:
                return False

        # Check amount threshold if specified
        if "min_amount" in requirements and metadata:
            if metadata.get("amount", 0) < requirements["min_amount"]:
                return False

        return True

    def reset_daily_challenges(self):
        """Reset daily challenges (run at midnight)"""
        # Mark expired daily challenges
        yesterday = date.today() - timedelta(days=1)

        expired = (
            self.db.query(UserChallenge)
            .join(Challenge)
            .filter(
                Challenge.type == "daily",
                UserChallenge.status == "active",
                UserChallenge.started_at < datetime.combine(yesterday, datetime.min.time()),
            )
            .all()
        )

        for challenge in expired:
            challenge.status = "expired"

        self.db.commit()

    def reset_weekly_challenges(self):
        """Reset weekly challenges (run on Monday)"""
        # Mark expired weekly challenges
        last_week = date.today() - timedelta(days=7)

        expired = (
            self.db.query(UserChallenge)
            .join(Challenge)
            .filter(
                Challenge.type == "weekly",
                UserChallenge.status == "active",
                UserChallenge.started_at < datetime.combine(last_week, datetime.min.time()),
            )
            .all()
        )

        for challenge in expired:
            challenge.status = "expired"

        self.db.commit()

    def get_active_multipliers(self, action: Optional[str] = None) -> List[XPMultiplier]:
        """Get currently active XP multipliers"""
        now = datetime.utcnow()

        query = self.db.query(XPMultiplier).filter(
            XPMultiplier.is_active == True,
            XPMultiplier.start_date <= now,
            XPMultiplier.end_date >= now,
        )

        multipliers = query.all()

        if action:
            # Filter multipliers that apply to this action
            multipliers = [m for m in multipliers if m.applies_to_action(action)]

        return multipliers

    def calculate_total_multiplier(self, action: str) -> float:
        """Calculate total XP multiplier for an action"""
        multipliers = self.get_active_multipliers(action)

        if not multipliers:
            return 1.0

        # Multiply all active multipliers
        total = 1.0
        for multiplier in multipliers:
            total *= multiplier.multiplier

        return total

    def initialize_daily_challenges(self):
        """Initialize a set of daily challenges"""
        daily_challenges = [
            {
                "code": "daily_login",
                "name": "Daily Check-in",
                "description": "Log in to check your finances",
                "type": "daily",
                "category": "consistency",
                "xp_reward": 10,
                "icon": "📱",
                "requirements": {"action": "daily_login", "count": 1},
            },
            {
                "code": "daily_transaction",
                "name": "Transaction Tracker",
                "description": "Log at least 3 transactions today",
                "type": "daily",
                "category": "tracking",
                "xp_reward": 25,
                "icon": "📝",
                "requirements": {"action": "transaction_created", "count": 3},
            },
            {
                "code": "daily_categorize",
                "name": "Category Master",
                "description": "Categorize 5 transactions",
                "type": "daily",
                "category": "organization",
                "xp_reward": 20,
                "icon": "🏷️",
                "requirements": {"action": "transaction_categorized", "count": 5},
            },
            {
                "code": "daily_no_spend",
                "name": "No Spend Challenge",
                "description": "Don't log any expenses today",
                "type": "daily",
                "category": "savings",
                "xp_reward": 30,
                "icon": "💰",
                "requirements": {"action": "no_expense", "count": 1},
            },
        ]

        for challenge_data in daily_challenges:
            existing = self.db.query(Challenge).filter_by(code=challenge_data["code"]).first()
            if not existing:
                challenge = Challenge(**challenge_data)
                self.db.add(challenge)

        self.db.commit()

    def initialize_weekly_challenges(self):
        """Initialize a set of weekly challenges"""
        weekly_challenges = [
            {
                "code": "weekly_budget_review",
                "name": "Budget Review",
                "description": "Review and update your budget",
                "type": "weekly",
                "category": "budgeting",
                "xp_reward": 100,
                "icon": "📊",
                "requirements": {"action": "budget_reviewed", "count": 1},
            },
            {
                "code": "weekly_savings_goal",
                "name": "Savings Sprint",
                "description": "Save at least ¥10,000 this week",
                "type": "weekly",
                "category": "savings",
                "xp_reward": 150,
                "icon": "🎯",
                "requirements": {"action": "savings_added", "min_amount": 10000, "count": 1},
            },
            {
                "code": "weekly_expense_reduction",
                "name": "Expense Cutter",
                "description": "Reduce spending by 10% from last week",
                "type": "weekly",
                "category": "budgeting",
                "xp_reward": 200,
                "icon": "✂️",
                "requirements": {"action": "expense_reduced", "percentage": 10, "count": 1},
            },
            {
                "code": "weekly_streak",
                "name": "Perfect Week",
                "description": "Log in every day this week",
                "type": "weekly",
                "category": "consistency",
                "xp_reward": 75,
                "icon": "⭐",
                "requirements": {"action": "daily_login", "count": 7},
            },
        ]

        for challenge_data in weekly_challenges:
            existing = self.db.query(Challenge).filter_by(code=challenge_data["code"]).first()
            if not existing:
                challenge = Challenge(**challenge_data)
                self.db.add(challenge)

        self.db.commit()

    def initialize_monthly_challenges(self):
        """Initialize a set of monthly challenges"""
        monthly_challenges = [
            {
                "code": "monthly_budget_master",
                "name": "Budget Master",
                "description": "Stay under budget in all categories",
                "type": "monthly",
                "category": "budgeting",
                "xp_reward": 500,
                "icon": "🏆",
                "requirements": {"action": "budget_met_all", "count": 1},
            },
            {
                "code": "monthly_savings_champion",
                "name": "Savings Champion",
                "description": "Save 20% of your income this month",
                "type": "monthly",
                "category": "savings",
                "xp_reward": 750,
                "icon": "💎",
                "requirements": {"action": "savings_rate", "percentage": 20, "count": 1},
            },
            {
                "code": "monthly_tracker",
                "name": "Transaction Master",
                "description": "Log 100 transactions this month",
                "type": "monthly",
                "category": "tracking",
                "xp_reward": 300,
                "icon": "📈",
                "requirements": {"action": "transaction_created", "count": 100},
            },
            {
                "code": "monthly_goal_progress",
                "name": "Goal Getter",
                "description": "Make progress on all your financial goals",
                "type": "monthly",
                "category": "goals",
                "xp_reward": 600,
                "icon": "🎯",
                "requirements": {"action": "goal_progress", "count": 1},
            },
        ]

        for challenge_data in monthly_challenges:
            existing = self.db.query(Challenge).filter_by(code=challenge_data["code"]).first()
            if not existing:
                challenge = Challenge(**challenge_data)
                self.db.add(challenge)

        self.db.commit()
