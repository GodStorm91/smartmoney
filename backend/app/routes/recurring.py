"""Recurring transactions API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.recurring import (
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
    RecurringTransactionResponse,
    RecurringTransactionListResponse,
)
from ..services.recurring_service import RecurringTransactionService

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.post("/", response_model=RecurringTransactionResponse, status_code=201)
async def create_recurring(
    data: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new recurring transaction."""
    recurring = RecurringTransactionService.create_recurring(
        db=db,
        user_id=current_user.id,
        data=data.model_dump(),
    )
    return _to_response(recurring)


@router.get("/", response_model=RecurringTransactionListResponse)
async def list_recurring(
    active_only: bool = Query(False, description="Only return active recurring"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all recurring transactions for the current user."""
    recurring_list = RecurringTransactionService.list_recurring(
        db=db,
        user_id=current_user.id,
        active_only=active_only,
    )
    return {
        "recurring_transactions": [_to_response(r) for r in recurring_list],
        "total": len(recurring_list),
    }


@router.get("/{recurring_id}", response_model=RecurringTransactionResponse)
async def get_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single recurring transaction by ID."""
    recurring = RecurringTransactionService.get_recurring(
        db=db,
        user_id=current_user.id,
        recurring_id=recurring_id,
    )
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return _to_response(recurring)


@router.patch("/{recurring_id}", response_model=RecurringTransactionResponse)
async def update_recurring(
    recurring_id: int,
    data: RecurringTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a recurring transaction."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    recurring = RecurringTransactionService.update_recurring(
        db=db,
        user_id=current_user.id,
        recurring_id=recurring_id,
        update_data=update_data,
    )

    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    return _to_response(recurring)


@router.delete("/{recurring_id}", status_code=204)
async def delete_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a recurring transaction."""
    deleted = RecurringTransactionService.delete_recurring(
        db=db,
        user_id=current_user.id,
        recurring_id=recurring_id,
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    return None


@router.post("/{recurring_id}/run", response_model=dict)
async def run_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a recurring transaction (for testing)."""
    recurring = RecurringTransactionService.get_recurring(
        db=db,
        user_id=current_user.id,
        recurring_id=recurring_id,
    )

    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    # Temporarily set next_run_date to today to trigger processing
    from datetime import date
    original_date = recurring.next_run_date
    recurring.next_run_date = date.today()
    db.commit()

    # Process the recurring transaction
    created = RecurringTransactionService.process_due_recurring(db, date.today())

    return {
        "message": f"Created {created} transaction(s)",
        "next_run_date": recurring.next_run_date.isoformat(),
    }


def _to_response(recurring) -> dict:
    """Convert RecurringTransaction model to response dict."""
    return {
        "id": recurring.id,
        "description": recurring.description,
        "amount": abs(recurring.amount),
        "category": recurring.category,
        "account_id": recurring.account_id,
        "is_income": recurring.is_income,
        "frequency": recurring.frequency,
        "interval_days": recurring.interval_days,
        "day_of_week": recurring.day_of_week,
        "day_of_month": recurring.day_of_month,
        "next_run_date": recurring.next_run_date,
        "last_run_date": recurring.last_run_date,
        "is_active": recurring.is_active,
        "created_at": recurring.created_at.isoformat(),
        "updated_at": recurring.updated_at.isoformat(),
    }
