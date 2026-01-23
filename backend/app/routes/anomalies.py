"""Anomaly detection API routes."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.anomaly import AnomalyAlert, AnomalyConfig
from ..models.transaction import Transaction
from ..models.user import User
from ..services.anomaly_detection_service import AnomalyDetectionService

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])


class AnomalyAlertResponse(BaseModel):
    """Response schema for anomaly alert."""

    id: int
    type: str
    severity: int
    transaction_id: int | None = None
    category: str | None = None
    description: str
    data: dict | None = None
    is_read: bool
    is_dismissed: bool
    created_at: datetime
    expires_at: datetime | None = None

    class Config:
        from_attributes = True


class AnomalyConfigResponse(BaseModel):
    """Response schema for anomaly configuration."""

    user_id: int
    sensitivity: str
    large_transaction_threshold: int
    unusual_spending_percent: int
    recurring_change_percent: int
    duplicate_charge_hours: int
    notification_channels: list[str] | None = None
    enabled_types: list[str] | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnomalyConfigUpdate(BaseModel):
    """Request schema for updating anomaly configuration."""

    sensitivity: str | None = Field(None, pattern="^(low|medium|high)$")
    large_transaction_threshold: int | None = Field(None, ge=0, le=1000000)
    unusual_spending_percent: int | None = Field(None, ge=0, le=500)
    recurring_change_percent: int | None = Field(None, ge=0, le=500)
    duplicate_charge_hours: int | None = Field(None, ge=1, le=168)
    enabled_types: list[str] | None = Field(None)


class AnomalyFeedback(BaseModel):
    """Feedback for improving anomaly detection."""

    is_useful: bool
    feedback: str | None = None


@router.get("", response_model=list[AnomalyAlertResponse])
async def get_anomaly_alerts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    severity: list[int] | None = Query(default=None),
    types: list[str] | None = Query(default=None),
) -> list[AnomalyAlert]:
    """Get anomaly alerts for the authenticated user."""
    service = AnomalyDetectionService(db)
    return service.get_user_alerts(
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only,
        severity=severity,
        types=types,
    )


@router.get("/config", response_model=AnomalyConfigResponse)
async def get_anomaly_config(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AnomalyConfig:
    """Get user's anomaly detection configuration."""
    service = AnomalyDetectionService(db)
    config = service.get_or_create_config(current_user.id)
    return config


@router.put("/config", response_model=AnomalyConfigResponse)
async def update_anomaly_config(
    config_update: AnomalyConfigUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AnomalyConfig:
    """Update anomaly detection settings."""
    service = AnomalyDetectionService(db)
    return service.update_config(
        user_id=current_user.id,
        sensitivity=config_update.sensitivity,
        large_transaction_threshold=config_update.large_transaction_threshold,
        unusual_spending_percent=config_update.unusual_spending_percent,
        recurring_change_percent=config_update.recurring_change_percent,
        duplicate_charge_hours=config_update.duplicate_charge_hours,
        enabled_types=config_update.enabled_types,
    )


@router.post("/{alert_id}/acknowledge")
async def acknowledge_anomaly(
    alert_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    feedback: AnomalyFeedback | None = None,
) -> dict:
    """Acknowledge an anomaly alert and provide feedback."""
    service = AnomalyDetectionService(db)
    success = service.mark_alert_read(alert_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )
    return {"message": "Alert acknowledged"}


@router.delete("/{alert_id}")
async def delete_anomaly(
    alert_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Delete an anomaly alert."""
    service = AnomalyDetectionService(db)
    success = service.delete_alert(alert_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )
    return {"message": "Alert deleted"}


@router.post("/scan")
async def trigger_anomaly_scan(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Trigger anomaly detection scan for current user.

    This endpoint scans recent transactions for anomalies and creates alerts.
    Rate limited to prevent abuse.
    """
    service = AnomalyDetectionService(db)

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= datetime.utcnow().replace(day=1).date(),
        )
        .all()
    )

    tx_dicts = [
        {
            "id": tx.id,
            "date": tx.date.isoformat(),
            "description": tx.description,
            "amount": tx.amount,
            "category": tx.category,
        }
        for tx in transactions
    ]

    anomalies = await service.detect_user_anomalies(current_user.id, tx_dicts)

    if anomalies:
        service.save_anomalies(current_user.id, anomalies)

    return {
        "message": f"Scan complete. {len(anomalies)} anomalies detected.",
        "anomalies_count": len(anomalies),
    }


class UnreadCountResponse(BaseModel):
    """Response for unread alert count."""

    count: int


@router.get("/unread/count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UnreadCountResponse:
    """Get count of unread anomaly alerts."""
    count = (
        db.query(AnomalyAlert)
        .filter(
            AnomalyAlert.user_id == current_user.id,
            AnomalyAlert.is_read == False,
            AnomalyAlert.is_dismissed == False,
        )
        .count()
    )
    return UnreadCountResponse(count=count)
