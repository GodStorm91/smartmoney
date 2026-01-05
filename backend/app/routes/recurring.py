"""Recurring transactions API routes."""
from datetime import date
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..models.recurring_transaction import RecurringTransaction
from ..schemas.recurring import (
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
    RecurringTransactionResponse,
    RecurringTransactionListResponse,
    RecurringMonthlySummaryResponse,
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


@router.get("/monthly-summary", response_model=RecurringMonthlySummaryResponse)
async def get_monthly_summary(
    month: str = Query(..., regex=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recurring transactions summary for a specific month (for spending prediction).

    Returns:
        - paid_this_month: Sum of recurring transactions already executed this month
        - upcoming_this_month: Sum of recurring transactions scheduled but not yet paid
    """
    # Parse month
    year, month_num = map(int, month.split("-"))
    month_start = date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    month_end = date(year, month_num, last_day)
    today = date.today()

    # Get all active recurring transactions for this user
    recurring_list = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id,
        RecurringTransaction.is_active == True,
    ).all()

    paid_transactions = []
    upcoming_transactions = []
    paid_total = 0
    upcoming_total = 0

    for r in recurring_list:
        # Only count expenses (not income) for spending prediction
        if r.is_income:
            continue

        amount = abs(r.amount)

        # Check if this recurring was paid this month (last_run_date is in this month)
        if r.last_run_date and month_start <= r.last_run_date <= month_end:
            paid_transactions.append({
                "id": r.id,
                "description": r.description,
                "amount": amount,
                "category": r.category,
                "is_income": r.is_income,
                "scheduled_date": r.last_run_date,
            })
            paid_total += amount

        # Check if this recurring is scheduled for this month but not yet paid
        # next_run_date is in this month AND is in the future (or today)
        if r.next_run_date and month_start <= r.next_run_date <= month_end:
            # Only count as upcoming if it's today or in the future
            if r.next_run_date >= today:
                upcoming_transactions.append({
                    "id": r.id,
                    "description": r.description,
                    "amount": amount,
                    "category": r.category,
                    "is_income": r.is_income,
                    "scheduled_date": r.next_run_date,
                })
                upcoming_total += amount

    return {
        "month": month,
        "paid_this_month": paid_total,
        "upcoming_this_month": upcoming_total,
        "paid_count": len(paid_transactions),
        "upcoming_count": len(upcoming_transactions),
        "paid_transactions": paid_transactions,
        "upcoming_transactions": upcoming_transactions,
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
