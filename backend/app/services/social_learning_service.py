from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.social_learning import (
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
from app.services.gamification_service import GamificationService


class QuizService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    def get_quizzes(self, topic: Optional[str] = None) -> List[Quiz]:
        q = self.db.query(Quiz).filter(Quiz.is_active == True)
        if topic:
            q = q.filter(Quiz.topic == topic)
        return q.all()

    def get_quiz(self, quiz_id: int) -> Optional[Quiz]:
        return self.db.query(Quiz).filter_by(id=quiz_id, is_active=True).first()

    def submit_quiz(
        self, user_id: int, quiz_id: int, answers: List[int], time_taken: Optional[int] = None
    ) -> Dict:
        quiz = self.get_quiz(quiz_id)
        if not quiz:
            raise ValueError("Quiz not found")

        questions = (
            self.db.query(QuizQuestion)
            .filter_by(quiz_id=quiz_id)
            .order_by(QuizQuestion.order_index)
            .all()
        )
        correct = sum(
            1
            for i, q in enumerate(questions)
            if i < len(answers) and q.correct_answer == answers[i]
        )
        total = len(questions)
        score = int((correct / total) * 100) if total > 0 else 0
        passed = score >= quiz.passing_score

        # Save attempt
        attempt = UserQuizAttempt(
            user_id=user_id,
            quiz_id=quiz_id,
            score=score,
            correct_answers=correct,
            total_questions=total,
            passed=passed,
            time_taken=time_taken,
        )
        self.db.add(attempt)

        # Award XP if passed
        xp_result = None
        if passed:
            xp_result = self.gamification.award_xp(
                user_id, "quiz_completed", {"quiz": quiz.title, "score": score, "topic": quiz.topic}
            )
            if quiz.xp_reward:
                self.gamification.award_xp(
                    user_id, "quiz_reward", {"quiz": quiz.title, "reward": quiz.xp_reward}
                )

        self.db.commit()
        return {
            "score": score,
            "correct": correct,
            "total": total,
            "passed": passed,
            "xp_earned": xp_result,
        }

    def initialize_quizzes(self):
        quizzes = [
            {
                "code": "budgeting_basics",
                "title": "Budgeting Basics",
                "description": "Learn the fundamentals of budgeting",
                "topic": "budgeting",
                "difficulty": "beginner",
                "xp_reward": 100,
                "passing_score": 70,
                "questions": [
                    {
                        "q": "What is the 50/30/20 rule?",
                        "o": [
                            "50% needs, 30% wants, 20% savings",
                            "50% savings, 30% wants, 20% needs",
                            "Equal splits",
                            "No rule exists",
                        ],
                        "a": 0,
                        "e": "The 50/30/20 rule allocates 50% to needs, 30% to wants, and 20% to savings.",
                    },
                    {
                        "q": "Why is emergency fund important?",
                        "o": [
                            "For vacations",
                            "Unexpected expenses",
                            "Investment",
                            "Luxury purchases",
                        ],
                        "a": 1,
                        "e": "An emergency fund protects you from unexpected expenses.",
                    },
                    {
                        "q": "What is a budget?",
                        "o": ["Bank account", "Spending plan", "Credit card", "Investment"],
                        "a": 1,
                        "e": "A budget is a plan for how you'll spend your money.",
                    },
                ],
            },
            {
                "code": "savings_strategies",
                "title": "Savings Strategies",
                "description": "Master the art of saving money",
                "topic": "savings",
                "difficulty": "beginner",
                "xp_reward": 100,
                "passing_score": 70,
                "questions": [
                    {
                        "q": "Best way to save?",
                        "o": [
                            "Spend first",
                            "Pay yourself first",
                            "Save leftovers",
                            "Credit cards",
                        ],
                        "a": 1,
                        "e": "Pay yourself first by saving before spending.",
                    },
                    {
                        "q": "How much emergency fund?",
                        "o": ["1 month expenses", "3-6 months expenses", "No limit", "1 week"],
                        "a": 1,
                        "e": "Financial experts recommend 3-6 months of expenses.",
                    },
                    {
                        "q": "What is compound interest?",
                        "o": [
                            "Interest on principal only",
                            "Interest on interest",
                            "Fixed interest",
                            "No interest",
                        ],
                        "a": 1,
                        "e": "Compound interest means earning interest on your interest.",
                    },
                ],
            },
            {
                "code": "investing_fundamentals",
                "title": "Investing Fundamentals",
                "description": "Introduction to investing",
                "topic": "investing",
                "difficulty": "intermediate",
                "xp_reward": 200,
                "passing_score": 75,
                "questions": [
                    {
                        "q": "What is diversification?",
                        "o": [
                            "One investment",
                            "Spreading investments",
                            "Day trading",
                            "Crypto only",
                        ],
                        "a": 1,
                        "e": "Diversification reduces risk by spreading investments.",
                    },
                    {
                        "q": "What is a stock?",
                        "o": ["Bank loan", "Company ownership", "Bond", "Government document"],
                        "a": 1,
                        "e": "A stock represents ownership in a company.",
                    },
                    {
                        "q": "What is ROI?",
                        "o": [
                            "Return on Investment",
                            "Rate of Interest",
                            "Regular Operation Income",
                            "Revenue of Interest",
                        ],
                        "a": 0,
                        "e": "ROI measures the return on an investment relative to its cost.",
                    },
                ],
            },
        ]
        for q_data in quizzes:
            existing = self.db.query(Quiz).filter_by(code=q_data["code"]).first()
            if not existing:
                questions = q_data.pop("questions")
                quiz = Quiz(**q_data)
                self.db.add(quiz)
                self.db.flush()
                for i, q in enumerate(questions):
                    self.db.add(
                        QuizQuestion(
                            quiz_id=quiz.id,
                            question=q["q"],
                            options=q["o"],
                            correct_answer=q["a"],
                            explanation=q["e"],
                            order_index=i,
                        )
                    )
        self.db.commit()


class LearningService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    def get_paths(self) -> List[LearningPath]:
        return (
            self.db.query(LearningPath)
            .filter(LearningPath.is_active == True)
            .order_by(LearningPath.order_index)
            .all()
        )

    def get_path(self, path_id: int) -> Optional[LearningPath]:
        return self.db.query(LearningPath).filter_by(id=path_id, is_active=True).first()

    def start_path(self, user_id: int, path_id: int) -> UserLearningProgress:
        path = self.get_path(path_id)
        if not path:
            raise ValueError("Learning path not found")

        existing = (
            self.db.query(UserLearningProgress).filter_by(user_id=user_id, path_id=path_id).first()
        )
        if existing:
            return existing

        total_modules = self.db.query(LearningModule).filter_by(path_id=path_id).count()
        progress = UserLearningProgress(
            user_id=user_id, path_id=path_id, total_modules=total_modules
        )
        self.db.add(progress)
        self.db.commit()
        return progress

    def complete_module(self, user_id: int, path_id: int, module_id: int) -> Dict:
        progress = (
            self.db.query(UserLearningProgress).filter_by(user_id=user_id, path_id=path_id).first()
        )
        if not progress:
            raise ValueError("Not started this path")

        module = self.db.query(LearningModule).filter_by(id=module_id, path_id=path_id).first()
        if not module:
            raise ValueError("Module not found")

        # Mark module complete (could add a separate table for tracking)
        progress.modules_completed += 1
        progress.progress_percentage = (progress.modules_completed / progress.total_modules) * 100

        # Award XP
        xp_result = self.gamification.award_xp(
            user_id, "module_completed", {"module": module.title}
        )

        if progress.modules_completed >= progress.total_modules:
            progress.completed_at = datetime.utcnow()
            self.gamification.award_xp(
                user_id, "path_completed", {"path": self.get_path(path_id).title}
            )

        self.db.commit()
        return {
            "modules_completed": progress.modules_completed,
            "total": progress.total_modules,
            "xp_earned": xp_result,
        }

    def initialize_paths(self):
        paths = [
            {
                "code": "finance_fundamentals",
                "title": "Financial Fundamentals",
                "description": "Master the basics of personal finance",
                "difficulty": "beginner",
                "xp_reward": 500,
                "icon": "📚",
                "order_index": 1,
            },
            {
                "code": "budgeting_master",
                "title": "Budgeting Mastery",
                "description": "Create and stick to effective budgets",
                "difficulty": "intermediate",
                "xp_reward": 750,
                "icon": "📊",
                "order_index": 2,
            },
            {
                "code": "savings_expert",
                "title": "Savings Expert",
                "description": "Build wealth through smart saving",
                "difficulty": "intermediate",
                "xp_reward": 750,
                "icon": "💰",
                "order_index": 3,
            },
            {
                "code": "investing_pro",
                "title": "Investing Pro",
                "description": "Grow your wealth through investing",
                "difficulty": "advanced",
                "xp_reward": 1000,
                "icon": "📈",
                "order_index": 4,
            },
        ]
        modules = {
            "finance_fundamentals": [
                ("What is Money?", "Understanding currency and value", 5, 20),
                ("Income vs Expenses", "Know the difference", 5, 20),
                ("Tracking Spending", "Where does money go?", 10, 25),
                ("Setting Goals", "Financial target setting", 5, 20),
            ],
            "budgeting_mastery": [
                ("Budget Methods", "50/30/20 and more", 10, 30),
                ("Tracking Categories", "Organize your spending", 10, 30),
                ("Adjusting Budgets", "When life changes", 10, 30),
            ],
            "savings_expert": [
                ("Pay Yourself First", "Save before spending", 5, 25),
                ("Emergency Fund", "Build your safety net", 15, 40),
                ("Savings Goals", "Dream to reality", 10, 30),
            ],
            "investing_pro": [
                ("Investment Basics", "Stocks, bonds, funds", 15, 50),
                ("Risk and Return", "Understanding the relationship", 10, 40),
                ("Diversification", "Don't put all eggs in one basket", 15, 50),
                ("Long-term Investing", "Time in market", 10, 40),
            ],
        }
        for p_data in paths:
            existing = self.db.query(LearningPath).filter_by(code=p_data["code"]).first()
            if not existing:
                path = LearningPath(**p_data)
                self.db.add(path)
                self.db.flush()
                for i, m in enumerate(modules.get(p_data["code"], [])):
                    self.db.add(
                        LearningModule(
                            path_id=path.id,
                            title=m[0],
                            content=m[1],
                            duration_minutes=m[2],
                            xp_reward=m[3],
                            order_index=i,
                        )
                    )
        self.db.commit()


class LeaderboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_leaderboard(
        self, metric: str = "savings_rate", period: str = "monthly", user_id: Optional[int] = None
    ) -> List[Dict]:
        now = datetime.utcnow()
        if period == "daily":
            period_value = now.strftime("%Y-%m-%d")
        elif period == "weekly":
            period_value = now.strftime("%Y-W%U")
        elif period == "monthly":
            period_value = now.strftime("%Y-%m")
        else:
            period_value = str(now.year)

        # Get user's stats
        if user_id:
            user_entry = (
                self.db.query(LeaderboardEntry)
                .filter_by(user_id=user_id, metric=metric, period=period, period_value=period_value)
                .first()
            )

        # Get top users (anonymous - no personal data)
        entries = (
            self.db.query(LeaderboardEntry)
            .filter_by(metric=metric, period=period, period_value=period_value)
            .order_by(LeaderboardEntry.value.desc())
            .limit(20)
            .all()
        )

        return [
            {"rank": i + 1, "percentile": e.percentile, "value": e.value}
            for i, e in enumerate(entries)
        ]

    def update_user_stats(self, user_id: int, metric: str, value: float):
        now = datetime.utcnow()
        period = "monthly"
        period_value = now.strftime("%Y-%m-%m")

        entry = (
            self.db.query(LeaderboardEntry)
            .filter_by(user_id=user_id, metric=metric, period=period, period_value=period_value)
            .first()
        )

        if not entry:
            entry = LeaderboardEntry(
                user_id=user_id,
                metric=metric,
                period=period,
                period_value=period_value,
                value=value,
            )
            self.db.add(entry)
        else:
            entry.value = value

        # Calculate percentile
        count = (
            self.db.query(func.count(LeaderboardEntry.id))
            .filter_by(metric=metric, period=period, period_value=period_value)
            .scalar()
        )
        if count > 1:
            better = (
                self.db.query(func.count(LeaderboardEntry.id))
                .filter(
                    LeaderboardEntry.metric == metric,
                    LeaderboardEntry.period == period,
                    LeaderboardEntry.period_value == period_value,
                    LeaderboardEntry.value > value,
                )
                .scalar()
            )
            entry.percentile = (1 - (better / (count - 1))) * 100 if count > 1 else 100

        self.db.commit()


class SocialService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    def create_group(self, user_id: int, name: str, description: str = "") -> SocialGroup:
        import secrets

        group = SocialGroup(
            code=name.lower().replace(" ", "_") + "_" + secrets.token_hex(4),
            name=name,
            description=description,
            join_code=secrets.token_hex(4)[:8].upper(),
        )
        self.db.add(group)
        self.db.flush()

        # Add creator as admin
        member = GroupMember(user_id=user_id, group_id=group.id, role="admin")
        self.db.add(member)
        self.db.commit()
        return group

    def join_group(self, user_id: int, join_code: str) -> SocialGroup:
        group = self.db.query(SocialGroup).filter_by(join_code=join_code, is_active=True).first()
        if not group:
            raise ValueError("Invalid join code")

        existing = self.db.query(GroupMember).filter_by(user_id=user_id, group_id=group.id).first()
        if existing:
            raise ValueError("Already a member")

        member = GroupMember(user_id=user_id, group_id=group.id)
        self.db.add(member)
        self.db.commit()
        return group

    def get_user_groups(self, user_id: int) -> List[SocialGroup]:
        return (
            self.db.query(SocialGroup)
            .join(GroupMember)
            .filter(GroupMember.user_id == user_id)
            .all()
        )

    def initialize_groups(self):
        # Create a public "SmartMoney Community" group
        existing = self.db.query(SocialGroup).filter_by(code="smartmoney_community").first()
        if not existing:
            group = SocialGroup(
                code="smartmoney_community",
                name="SmartMoney Community",
                description="A community for all SmartMoney users to share tips and challenges",
                privacy="public",
                join_code="SMARTMONEY",
            )
            self.db.add(group)
            self.db.commit()
