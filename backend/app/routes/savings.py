"""Savings Recommendations API endpoints."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user, get_db
from ..models import User, SavingsRecommendation
from ..services.savings_recommender_service import SavingsRecommenderService

router = APIRouter(prefix="/api/savings", tags=["savings"])


class SavingsRecommendationResponse(BaseModel):
    """Savings recommendation response schema."""

    id: int
    category: str
    recommendation: str
    potential_savings: int
    action_type: str
    status: str
    action_data: dict[str, Any] | None
    created_at: datetime
    applied_at: datetime | None
    dismissed_at: datetime | None

    class Config:
        from_attributes = True


class SavingsDetailResponse(BaseModel):
    """Savings recommendation detail response schema."""

    id: int
    category: str
    recommendation: str
    potential_savings: int
    action_type: str
    status: str
    action_data: dict[str, Any] | None
    created_at: datetime
    applied_at: datetime | None
    dismissed_at: datetime | None


class SavingsPotentialSummary(BaseModel):
    """Savings potential summary response schema."""

    total_potential: int
    by_category: dict[str, int]
    by_action_type: dict[str, int]
    top_recommendations: list[dict[str, Any]]
    pending_count: int


class ActionResponse(BaseModel):
    """Action response schema."""

    success: bool
    message: str


@router.get("/recommendations", response_model=list[SavingsRecommendationResponse])
async def get_savings_recommendations(
    limit: int = Query(default=10, le=50),
    status: str | None = Query(default=None, pattern="^(pending|applied|dismissed)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SavingsRecommendationResponse]:
    """
    Get personalized savings recommendations.

    Sorted by potential savings (highest first).
    """
    service = SavingsRecommenderService()
    recommendations = await service.get_user_recommendations(
        db=db, user_id=current_user.id, limit=limit, status=status
    )

    return [
        SavingsRecommendationResponse(
            id=rec.id,
            category=rec.category,
            recommendation=rec.recommendation,
            potential_savings=rec.potential_savings,
            action_type=rec.action_type,
            status=rec.status,
            action_data=rec.action_data,
            created_at=rec.created_at,
            applied_at=rec.applied_at,
            dismissed_at=rec.dismissed_at,
        )
        for rec in recommendations
    ]


@router.get("/recommendations/{recommendation_id}", response_model=SavingsDetailResponse)
async def get_recommendation_details(
    recommendation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavingsDetailResponse:
    """
    Get full details of a savings recommendation.
    """
    rec = (
        db.query(SavingsRecommendation)
        .filter(
            SavingsRecommendation.id == recommendation_id,
            SavingsRecommendation.user_id == current_user.id,
        )
        .first()
    )

    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return SavingsDetailResponse(
        id=rec.id,
        category=rec.category,
        recommendation=rec.recommendation,
        potential_savings=rec.potential_savings,
        action_type=rec.action_type,
        status=rec.status,
        action_data=rec.action_data,
        created_at=rec.created_at,
        applied_at=rec.applied_at,
        dismissed_at=rec.dismissed_at,
    )


@router.post("/recommendations/{recommendation_id}/apply", response_model=ActionResponse)
async def apply_savings_recommendation(
    recommendation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActionResponse:
    """
    Apply a savings recommendation.

    This marks the recommendation as applied and could trigger
    related actions like creating a budget adjustment.
    """
    service = SavingsRecommenderService()
    success = await service.apply_recommendation(db, current_user.id, recommendation_id)

    if not success:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return ActionResponse(success=True, message="Recommendation applied successfully")


@router.put("/recommendations/{recommendation_id}/dismiss", response_model=ActionResponse)
async def dismiss_recommendation(
    recommendation_id: int,
    reason: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActionResponse:
    """
    Dismiss a savings recommendation.
    """
    service = SavingsRecommenderService()
    success = await service.dismiss_recommendation(db, current_user.id, recommendation_id, reason)

    if not success:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return ActionResponse(success=True, message="Recommendation dismissed")


@router.get("/potential", response_model=SavingsPotentialSummary)
async def get_savings_potential(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavingsPotentialSummary:
    """
    Get summary of total potential savings across all categories.
    """
    service = SavingsRecommenderService()
    potential = await service.get_savings_potential(db, current_user.id)

    return SavingsPotentialSummary(
        total_potential=potential["total_potential"],
        by_category=potential["by_category"],
        by_action_type=potential["by_action_type"],
        top_recommendations=potential["top_recommendations"],
        pending_count=potential["pending_count"],
    )


@router.get("/unread/count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """
    Get count of pending recommendations.
    """
    service = SavingsRecommenderService()
    count = await service.get_unread_count(db, current_user.id)

    return {"count": count}


class GenerateResponse(BaseModel):
    """Generate recommendations response schema."""

    message: str
    count: int
    total_potential: int


@router.post("/generate")
async def generate_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateResponse:
    """
    Generate new savings recommendations.

    This analyzes recent transactions and generates personalized
    recommendations for the user.
    """
    service = SavingsRecommenderService()
    recommendations = await service.generate_recommendations(db, current_user.id)

    await service.save_recommendations(db, current_user.id, recommendations)

    total_potential = sum(r.get("potential_savings", 0) for r in recommendations)

    return GenerateResponse(
        message="Recommendations generated successfully",
        count=len(recommendations),
        total_potential=total_potential,
    )


class LiveRecommendationsResponse(BaseModel):
    """Live recommendations response schema."""

    recommendations: list[dict[str, Any]]
    count: int
    total_potential: int


@router.get("/live", response_model=LiveRecommendationsResponse)
async def get_live_recommendations(
    limit: int = Query(default=10, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LiveRecommendationsResponse:
    """
    Get live recommendations generated on the fly (not from database).

    Useful for real-time dashboard updates.
    """
    service = SavingsRecommenderService()
    recommendations = await service.generate_recommendations(db, current_user.id, limit=limit)
    total_potential = sum(r.get("potential_savings", 0) for r in recommendations)

    return LiveRecommendationsResponse(
        recommendations=recommendations,
        count=len(recommendations),
        total_potential=total_potential,
    )
