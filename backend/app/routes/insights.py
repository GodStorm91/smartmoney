"""Insights API endpoints."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.insight import InsightCard
from ..models.user import User
from ..services.insight_generator_service import InsightGeneratorService

router = APIRouter(prefix="/api/insights", tags=["insights"])


class InsightCardResponse(BaseModel):
    """Insight card response schema."""

    id: int
    type: str
    title: str
    message: str
    priority: int
    data: dict[str, Any]
    action_url: str | None
    action_label: str | None
    is_read: bool
    created_at: datetime
    expires_at: datetime | None

    class Config:
        from_attributes = True


class InsightDetailResponse(BaseModel):
    """Insight detail response schema."""

    id: int
    type: str
    title: str
    message: str
    priority: int
    data: dict[str, Any]
    action_url: str | None
    action_label: str | None
    is_read: bool
    created_at: datetime
    expires_at: datetime | None


class DismissResponse(BaseModel):
    """Dismiss response schema."""

    success: bool
    message: str


@router.get("", response_model=list[InsightCardResponse])
async def get_dashboard_insights(
    limit: int = Query(default=10, le=50),
    unread_only: bool = Query(default=False),
    types: list[str] | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InsightCardResponse]:
    """
    Get insight cards for dashboard display.

    Sorted by priority (highest first) then created_at.
    """
    service = InsightGeneratorService()

    insights_db = await service.get_user_insights(
        db=db, user_id=current_user.id, limit=limit, unread_only=unread_only, types=types
    )

    return [
        InsightCardResponse(
            id=insight.id,
            type=insight.type,
            title=insight.title,
            message=insight.message,
            priority=insight.priority,
            data=insight.data,
            action_url=insight.action_url,
            action_label=insight.action_label,
            is_read=insight.is_read,
            created_at=insight.created_at,
            expires_at=insight.expires_at,
        )
        for insight in insights_db
    ]


@router.get("/{insight_id}", response_model=InsightDetailResponse)
async def get_insight_details(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InsightDetailResponse:
    """
    Get full details of a specific insight with expanded data.
    """
    insight = (
        db.query(InsightCard)
        .filter(InsightCard.id == insight_id, InsightCard.user_id == current_user.id)
        .first()
    )

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    return InsightDetailResponse(
        id=insight.id,
        type=insight.type,
        title=insight.title,
        message=insight.message,
        priority=insight.priority,
        data=insight.data,
        action_url=insight.action_url,
        action_label=insight.action_label,
        is_read=insight.is_read,
        created_at=insight.created_at,
        expires_at=insight.expires_at,
    )


@router.put("/{insight_id}/dismiss", response_model=DismissResponse)
async def dismiss_insight(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DismissResponse:
    """
    Dismiss an insight card.
    """
    service = InsightGeneratorService()
    success = await service.dismiss_insight(db, current_user.id, insight_id)

    if not success:
        raise HTTPException(status_code=404, detail="Insight not found")

    return DismissResponse(success=True, message="Insight dismissed successfully")


@router.put("/{insight_id}/read", response_model=DismissResponse)
async def mark_insight_read(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DismissResponse:
    """
    Mark an insight as read.
    """
    service = InsightGeneratorService()
    success = await service.mark_insight_read(db, current_user.id, insight_id)

    if not success:
        raise HTTPException(status_code=404, detail="Insight not found")

    return DismissResponse(success=True, message="Insight marked as read")


@router.post("/refresh")
async def refresh_insights(
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Trigger insight regeneration.

    Rate limited to prevent abuse.
    """
    service = InsightGeneratorService()

    insights = await service.generate_dashboard_insights(db, current_user.id)

    if force:
        await service.save_insights_to_db(db, current_user.id, insights)

    return {
        "message": "Insights generated successfully",
        "count": len(insights),
        "insights": insights,
    }


@router.get("/unread/count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """
    Get count of unread insights.
    """
    service = InsightGeneratorService()
    count = await service.get_unread_count(db, current_user.id)

    return {"count": count}


class LiveInsightsResponse(BaseModel):
    """Live insights response schema (generated on the fly)."""

    insights: list[dict[str, Any]]
    count: int


@router.get("/live", response_model=LiveInsightsResponse)
async def get_live_insights(
    limit: int = Query(default=10, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LiveInsightsResponse:
    """
    Get live insights generated on the fly (not from database).

    Useful for real-time dashboard updates.
    """
    service = InsightGeneratorService()
    insights = await service.generate_dashboard_insights(db, current_user.id, limit=limit)

    return LiveInsightsResponse(insights=insights, count=len(insights))
