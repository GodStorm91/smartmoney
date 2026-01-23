"""Notification API endpoints."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models import User
from ..models.notification import NotificationPreference, PushSubscription
from ..services.notification_service import (
    NotificationService,
    NotificationPreferenceService,
    PushSubscriptionService,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    """Notification response schema."""

    id: int
    type: str
    title: str
    message: str
    data: dict[str, Any]
    priority: int
    is_read: bool
    action_url: str | None
    action_label: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCountResponse(BaseModel):
    """Notification count response schema."""

    count: int


class MarkReadResponse(BaseModel):
    """Mark read response schema."""

    success: bool
    message: str


class PreferenceUpdateRequest(BaseModel):
    """Preference update request schema."""

    enabled: bool
    settings: dict[str, Any] | None = None


class PreferenceResponse(BaseModel):
    """Preference response schema."""

    push: dict[str, Any]
    email: dict[str, Any]
    in_app: dict[str, Any]


class PushSubscriptionRequest(BaseModel):
    """Push subscription request schema."""

    endpoint: str
    p256dh: str
    auth: str
    browser: str


class PushSubscriptionResponse(BaseModel):
    """Push subscription response schema."""

    success: bool
    message: str


@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    limit: int = Query(default=20, le=100),
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationResponse]:
    """
    Get user's notifications.
    """
    service = NotificationService()
    notifications = await service.get_user_notifications(
        db=db,
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only,
    )

    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            message=n.message,
            data=n.data,
            priority=n.priority,
            is_read=n.is_read,
            action_url=n.action_url,
            action_label=n.action_label,
            created_at=n.created_at,
        )
        for n in notifications
    ]


@router.get("/unread/count", response_model=NotificationCountResponse)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationCountResponse:
    """
    Get count of unread notifications.
    """
    service = NotificationService()
    count = await service.get_unread_count(db, current_user.id)

    return NotificationCountResponse(count=count)


@router.put("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MarkReadResponse:
    """
    Mark a notification as read.
    """
    service = NotificationService()
    success = await service.mark_notification_read(db, current_user.id, notification_id)

    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return MarkReadResponse(success=True, message="Notification marked as read")


@router.put("/read-all", response_model=MarkReadResponse)
async def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MarkReadResponse:
    """
    Mark all notifications as read.
    """
    service = NotificationService()
    count = await service.mark_all_read(db, current_user.id)

    return MarkReadResponse(success=True, message=f"Marked {count} notifications as read")


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MarkReadResponse:
    """
    Delete a notification.
    """
    service = NotificationService()
    success = await service.delete_notification(db, current_user.id, notification_id)

    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return MarkReadResponse(success=True, message="Notification deleted")


@router.get("/preferences", response_model=PreferenceResponse)
async def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PreferenceResponse:
    """
    Get user's notification preferences.
    """
    service = NotificationPreferenceService()
    preferences = service.get_preferences(db, current_user.id)

    return PreferenceResponse(**preferences)


@router.put("/preferences/{channel}")
async def update_preference(
    channel: str,
    request: PreferenceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Update a notification channel preference.
    """
    if channel not in ["push", "email", "in_app"]:
        raise HTTPException(
            status_code=400, detail="Invalid channel. Must be push, email, or in_app"
        )

    service = NotificationPreferenceService()
    pref = service.update_preference(
        db,
        current_user.id,
        channel,
        request.enabled,
        request.settings,
    )

    return {
        "channel": pref.channel,
        "enabled": pref.enabled,
        "settings": pref.settings,
    }


@router.post("/push/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_push(
    request: PushSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PushSubscriptionResponse:
    """
    Subscribe to push notifications.
    """
    service = PushSubscriptionService()
    subscription = service.subscribe(
        db,
        current_user.id,
        request.endpoint,
        request.p256dh,
        request.auth,
        request.browser,
    )

    return PushSubscriptionResponse(success=True, message="Push subscription created")


@router.post("/push/unsubscribe")
async def unsubscribe_push(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PushSubscriptionResponse:
    """
    Unsubscribe from push notifications.
    """
    service = PushSubscriptionService()
    success = service.unsubscribe(db, current_user.id, endpoint)

    if not success:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return PushSubscriptionResponse(success=True, message="Push subscription removed")


@router.post("/cleanup")
async def cleanup_old_notifications(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """
    Delete old read notifications (admin only in production).
    """
    service = NotificationService()
    count = await service.delete_old_notifications(db, days)

    return {"deleted": count}
