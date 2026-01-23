from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Date,
    Float,
    Boolean,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from ..models.transaction import Base


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    topic = Column(String(50), nullable=False)
    difficulty = Column(String(20), nullable=False)
    xp_reward = Column(Integer, default=50)
    time_limit = Column(Integer)
    passing_score = Column(Integer, default=70)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    questions = relationship("QuizQuestion", back_populates="quiz")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(Integer, nullable=False)
    explanation = Column(Text)
    order_index = Column(Integer, default=0)
    quiz = relationship("Quiz", back_populates="questions")


class UserQuizAttempt(Base):
    __tablename__ = "user_quiz_attempts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)
    time_taken = Column(Integer)
    attempted_at = Column(DateTime, default=datetime.utcnow)


class LearningPath(Base):
    __tablename__ = "learning_paths"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    difficulty = Column(String(20), nullable=False)
    total_duration = Column(Integer)
    xp_reward = Column(Integer, default=100)
    icon = Column(String(10))
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    modules = relationship("LearningModule", back_populates="path")


class LearningModule(Base):
    __tablename__ = "learning_modules"
    id = Column(Integer, primary_key=True)
    path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    order_index = Column(Integer, default=0)
    xp_reward = Column(Integer, default=20)
    duration_minutes = Column(Integer)
    path = relationship("LearningPath", back_populates="modules")


class UserLearningProgress(Base):
    __tablename__ = "user_learning_progress"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    modules_completed = Column(Integer, default=0)
    total_modules = Column(Integer, nullable=False)
    progress_percentage = Column(Float, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    period = Column(String(20), nullable=False)
    period_value = Column(String(20))
    rank = Column(Integer)
    percentile = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow)


class SocialGroup(Base):
    __tablename__ = "social_groups"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    join_code = Column(String(20))
    privacy = Column(String(20), default="private")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    members = relationship("GroupMember", back_populates="group")
    challenges = relationship("GroupChallenge", back_populates="group")


class GroupMember(Base):
    __tablename__ = "group_members"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("social_groups.id"), nullable=False)
    role = Column(String(20), default="member")
    joined_at = Column(DateTime, default=datetime.utcnow)
    group = relationship("SocialGroup", back_populates="members")


class GroupChallenge(Base):
    __tablename__ = "group_challenges"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("social_groups.id"), nullable=False)
    name = Column(String(100), nullable=False)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, default=0)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    group = relationship("SocialGroup", back_populates="challenges")
