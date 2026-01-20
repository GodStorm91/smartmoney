"""Bills API routes."""

from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.bill import (
    BillCalendarResponse,
    BillCreate,
    BillDeleteResponse,
    BillDetailResponse,
    BillListResponse,
    BillResponse,
    BillUpdate,
    MarkBillPaidRequest,
    MarkBillPaidResponse,
    PartialPaymentStatusResponse,
    ReminderScheduleCreate,
    ReminderScheduleDeleteResponse,
    ReminderScheduleListResponse,
    ReminderScheduleResponse,
    UpcomingBillsResponse,
)
from ..services.bill_service import BillReminderService

router = APIRouter(prefix="/api/bills", tags=["bills"])


@router.get("", response_model=BillListResponse)
def get_bills(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    category: str | None = Query(None, description="Filter by category"),
    recurring_only: bool | None = Query(None, description="Filter recurring only"),
    is_active: bool = True,
):
    """Get all bills for the current user."""
    bills = BillReminderService.get_bills(db, current_user.id, category, recurring_only, is_active)

    return {"success": True, "bills": bills, "total_count": len(bills)}


@router.get("/{bill_id}", response_model=BillDetailResponse)
def get_bill(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get bill details with payment history."""
    bill = BillReminderService.get_bill(db, bill_id, current_user.id)

    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    return {"success": True, "bill": bill, "history": bill.history}


@router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill_data: BillCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new bill."""
    bill = BillReminderService.create_bill(db, current_user.id, bill_data.model_dump())
    return bill


@router.put("/{bill_id}", response_model=BillResponse)
def update_bill(
    bill_id: int,
    bill_data: BillUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update a bill."""
    bill = BillReminderService.update_bill(
        db, bill_id, current_user.id, bill_data.model_dump(exclude_unset=True)
    )

    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    return bill


@router.delete("/{bill_id}", response_model=BillDeleteResponse)
def delete_bill(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a bill (soft delete)."""
    success = BillReminderService.delete_bill(db, bill_id, current_user.id)

    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    return {"success": True, "message": "Bill deleted successfully"}


@router.get("/calendar", response_model=BillCalendarResponse)
def get_bill_calendar(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
):
    """Get bills for calendar view."""
    result = BillReminderService.get_calendar_bills(db, current_user.id, year, month)
    return {"success": True, **result}


@router.get("/upcoming", response_model=UpcomingBillsResponse)
def get_upcoming_bills(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    days: int = Query(7, ge=1, le=365, description="Number of days to look ahead"),
):
    """Get upcoming bills within specified days."""
    bills = BillReminderService.get_upcoming_bills(db, current_user.id, days)

    upcoming_data = []
    total_amount = 0
    today = date.today()

    for bill in bills:
        days_until = (bill.next_due_date - today).days
        upcoming_data.append(
            {
                "id": bill.id,
                "name": bill.name,
                "amount": bill.amount,
                "due_date": bill.next_due_date,
                "days_until_due": days_until,
                "category": bill.category,
                "reminder_enabled": bill.reminder_enabled,
                "reminder_days_before": bill.reminder_days_before,
            }
        )
        total_amount += bill.amount

    return {
        "success": True,
        "upcoming_bills": upcoming_data,
        "total_count": len(upcoming_data),
        "total_amount": total_amount,
    }


@router.post("/{bill_id}/mark-paid", response_model=MarkBillPaidResponse)
def mark_bill_as_paid(
    bill_id: int,
    request: MarkBillPaidRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Mark a bill as paid."""
    bill, history = BillReminderService.mark_as_paid(
        db, bill_id, current_user.id, request.paid_date, request.amount_paid, request.notes
    )

    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    return {
        "success": True,
        "id": bill.id,
        "is_paid": bill.is_paid,
        "paid_date": bill.last_paid_date,
        "next_due_date": bill.next_due_date,
        "history_id": history.id if history else None,
    }


@router.post("/{bill_id}/mark-unpaid", response_model=BillResponse)
def mark_bill_as_unpaid(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Mark a bill as unpaid (undo payment)."""
    bill = BillReminderService.mark_as_unpaid(db, bill_id, current_user.id)

    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    return bill


# === Reminder Schedule Endpoints ===


@router.post(
    "/{bill_id}/schedules",
    response_model=ReminderScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_reminder_schedule(
    bill_id: int,
    schedule_data: ReminderScheduleCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a custom reminder schedule for a bill."""
    try:
        schedule = BillReminderService.create_reminder_schedule(
            db, bill_id, current_user.id, schedule_data.model_dump()
        )
        return schedule
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{bill_id}/schedules", response_model=ReminderScheduleListResponse)
def get_reminder_schedules(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get all reminder schedules for a bill."""
    # Verify bill belongs to user
    bill = BillReminderService.get_bill(db, bill_id, current_user.id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    schedules = BillReminderService.get_reminder_schedules(db, bill_id)
    return {"success": True, "schedules": schedules}


@router.delete("/{bill_id}/schedules/{schedule_id}", response_model=ReminderScheduleDeleteResponse)
def delete_reminder_schedule(
    bill_id: int,
    schedule_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a reminder schedule."""
    success = BillReminderService.delete_reminder_schedule(db, schedule_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Reminder schedule not found"
        )

    return {"success": True, "message": "Reminder schedule deleted successfully"}


# === Partial Payment Endpoints ===


@router.get("/{bill_id}/partial-payment", response_model=PartialPaymentStatusResponse)
def get_partial_payment_status(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get partial payment status for a bill."""
    try:
        status_data = BillReminderService.get_partial_payment_status(db, bill_id, current_user.id)
        return {"success": True, **status_data}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{bill_id}/trigger-partial-payment-alert")
def trigger_partial_payment_alert(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Manually trigger a partial payment alert for a bill."""
    from ..services.bill_notification_mixin import BillNotificationMixin

    try:
        should_alert = BillReminderService.should_alert_partial_payment(
            db, bill_id, current_user.id
        )
        if not should_alert:
            return {"success": True, "message": "No alert needed", "alert_sent": False}

        # Send the alert
        bill = BillReminderService.get_bill(db, bill_id, current_user.id)
        if bill:
            BillNotificationMixin.send_partial_payment_alert(db, bill)
            return {"success": True, "message": "Alert sent", "alert_sent": True}

        return {"success": True, "message": "Bill not found", "alert_sent": False}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
