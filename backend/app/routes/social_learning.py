from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..services.social_learning_service import (
    QuizService,
    LearningService,
    LeaderboardService,
    SocialService,
)
from ..auth.dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/social", tags=["social"])


# Quiz endpoints
class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: List[int]
    time_taken: Optional[int] = None


@router.get("/quizzes")
async def get_quizzes(topic: Optional[str] = None, db: Session = Depends(get_db)):
    service = QuizService(db)
    quizzes = service.get_quizzes(topic)
    return [
        {
            "id": q.id,
            "code": q.code,
            "title": q.title,
            "description": q.description,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "xp_reward": q.xp_reward,
            "time_limit": q.time_limit,
            "passing_score": q.passing_score,
            "questions_count": len(q.questions),
        }
        for q in quizzes
    ]


@router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    service = QuizService(db)
    quiz = service.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {
        "id": quiz.id,
        "code": quiz.code,
        "title": quiz.title,
        "description": quiz.description,
        "topic": quiz.topic,
        "difficulty": quiz.difficulty,
        "xp_reward": quiz.xp_reward,
        "time_limit": quiz.time_limit,
        "passing_score": quiz.passing_score,
        "questions": [
            {"id": q.id, "question": q.question, "options": q.options, "order": q.order_index}
            for q in quiz.questions
        ],
    }


@router.post("/quizzes/submit")
async def submit_quiz(
    req: QuizSubmitRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = QuizService(db)
    try:
        result = service.submit_quiz(user.id, req.quiz_id, req.answers, req.time_taken)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/quizzes/initialize")
async def initialize_quizzes(db: Session = Depends(get_db)):
    service = QuizService(db)
    service.initialize_quizzes()
    return {"message": "Quizzes initialized"}


# Learning paths endpoints
@router.get("/learning-paths")
async def get_learning_paths(db: Session = Depends(get_db)):
    service = LearningService(db)
    paths = service.get_paths()
    return [
        {
            "id": p.id,
            "code": p.code,
            "title": p.title,
            "description": p.description,
            "difficulty": p.difficulty,
            "xp_reward": p.xp_reward,
            "icon": p.icon,
            "modules_count": len(p.modules),
            "total_duration": p.total_duration,
        }
        for p in paths
    ]


@router.get("/learning-paths/{path_id}")
async def get_learning_path(path_id: int, db: Session = Depends(get_db)):
    service = LearningService(db)
    path = service.get_path(path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    return {
        "id": path.id,
        "code": path.code,
        "title": path.title,
        "description": path.description,
        "difficulty": path.difficulty,
        "xp_reward": path.xp_reward,
        "icon": path.icon,
        "modules": [
            {
                "id": m.id,
                "title": m.title,
                "content": m.content[:200] + "...",
                "duration_minutes": m.duration_minutes,
                "xp_reward": m.xp_reward,
            }
            for m in path.modules
        ],
    }


@router.post("/learning-paths/{path_id}/start")
async def start_learning_path(
    path_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = LearningService(db)
    try:
        progress = service.start_path(user.id, path_id)
        return {"message": "Learning path started", "modules_total": progress.total_modules}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/learning-paths/{path_id}/modules/{module_id}/complete")
async def complete_module(
    path_id: int,
    module_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = LearningService(db)
    try:
        result = service.complete_module(user.id, path_id, module_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/learning-paths/initialize")
async def initialize_learning_paths(db: Session = Depends(get_db)):
    service = LearningService(db)
    service.initialize_paths()
    return {"message": "Learning paths initialized"}


# Leaderboard endpoints
@router.get("/leaderboard")
async def get_leaderboard(
    metric: str = "savings_rate",
    period: str = "monthly",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = LeaderboardService(db)
    entries = service.get_leaderboard(metric, period, user.id)
    return {"metric": metric, "period": period, "entries": entries}


# Social groups endpoints
class CreateGroupRequest(BaseModel):
    name: str
    description: str = ""


class JoinGroupRequest(BaseModel):
    join_code: str


@router.post("/groups/create")
async def create_group(
    req: CreateGroupRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = SocialService(db)
    group = service.create_group(user.id, req.name, req.description)
    return {"id": group.id, "code": group.code, "name": group.name, "join_code": group.join_code}


@router.post("/groups/join")
async def join_group(
    req: JoinGroupRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = SocialService(db)
    try:
        group = service.join_group(user.id, req.join_code)
        return {"id": group.id, "name": group.name, "message": "Joined successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/groups/my")
async def get_my_groups(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = SocialService(db)
    groups = service.get_user_groups(user.id)
    return [
        {"id": g.id, "name": g.name, "description": g.description, "members_count": len(g.members)}
        for g in groups
    ]


@router.post("/groups/initialize")
async def initialize_groups(db: Session = Depends(get_db)):
    service = SocialService(db)
    service.initialize_groups()
    return {"message": "Groups initialized"}
