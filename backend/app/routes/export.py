"""Export API routes for iOS app data transfer."""
import json
import os
import re
import time
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..config import settings as app_settings
from ..database import get_db
from ..models.account import Account
from ..models.bill import Bill, BillHistory
from ..models.budget import Budget, BudgetAllocation
from ..models.category import Category
from ..models.goal import Goal
from ..models.settings import AppSettings
from ..models.tag import Tag
from ..models.transaction import Transaction
from ..models.user import User

router = APIRouter(prefix="/api/export", tags=["export"])

EXPORTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "exports"
)
LINK_EXPIRY_SECONDS = 600  # 10 minutes


def _build_export_data(db: Session, user_id: int) -> dict:
    """Build the export data dict for a given user."""
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .all()
    )

    accounts = (
        db.query(Account)
        .filter(Account.user_id == user_id)
        .all()
    )

    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.is_active == True)
        .all()
    )

    goals = (
        db.query(Goal)
        .filter(Goal.user_id == user_id)
        .all()
    )

    bills = (
        db.query(Bill)
        .filter(Bill.user_id == user_id)
        .all()
    )

    categories = (
        db.query(Category)
        .filter(
            (Category.user_id == user_id) | (Category.is_system == True)
        )
        .all()
    )

    tags = (
        db.query(Tag)
        .filter(Tag.user_id == user_id)
        .all()
    )

    settings = (
        db.query(AppSettings)
        .filter(AppSettings.user_id == user_id)
        .first()
    )

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "version": "1.0",
        "exportedAt": now,
        "app": "smartmoney-web",
        "data": {
            "transactions": [
                {
                    "id": tx.id,
                    "date": tx.date.isoformat(),
                    "description": tx.description,
                    "amount": tx.amount,
                    "currency": tx.currency,
                    "category": tx.category,
                    "subcategory": tx.subcategory,
                    "source": tx.source,
                    "paymentMethod": tx.payment_method,
                    "notes": tx.notes,
                    "type": "income" if tx.is_income else "expense",
                    "isTransfer": tx.is_transfer,
                    "isAdjustment": tx.is_adjustment,
                    "accountId": tx.account_id,
                }
                for tx in transactions
            ],
            "accounts": [
                {
                    "id": acc.id,
                    "name": acc.name,
                    "type": acc.type,
                    "initialBalance": acc.initial_balance,
                    "initialBalanceDate": acc.initial_balance_date.isoformat(),
                    "isActive": acc.is_active,
                    "currency": acc.currency,
                    "notes": acc.notes,
                }
                for acc in accounts
            ],
            "budgets": [
                {
                    "id": b.id,
                    "month": b.month,
                    "monthlyIncome": b.monthly_income,
                    "savingsTarget": b.savings_target,
                    "advice": b.advice,
                    "allocations": [
                        {
                            "category": a.category,
                            "amount": a.amount,
                            "reasoning": a.reasoning,
                        }
                        for a in b.allocations
                    ],
                }
                for b in budgets
            ],
            "goals": [
                {
                    "id": g.id,
                    "years": g.years,
                    "targetAmount": g.target_amount,
                    "currency": "JPY",
                    "startDate": g.start_date.isoformat() if g.start_date else None,
                }
                for g in goals
            ],
            "bills": [
                {
                    "id": bill.id,
                    "name": bill.name,
                    "description": bill.description,
                    "amount": bill.amount,
                    "category": bill.category,
                    "color": bill.color,
                    "dueDay": bill.due_day,
                    "dueTime": bill.due_time.strftime("%H:%M") if bill.due_time else None,
                    "isRecurring": bill.is_recurring,
                    "recurrenceType": bill.recurrence_type,
                    "nextDueDate": bill.next_due_date.isoformat(),
                    "lastPaidDate": bill.last_paid_date.isoformat() if bill.last_paid_date else None,
                    "reminderDaysBefore": bill.reminder_days_before,
                    "reminderEnabled": bill.reminder_enabled,
                    "isPaid": bill.is_paid,
                    "isActive": bill.is_active,
                    "history": [
                        {
                            "paidDate": h.paid_date.isoformat(),
                            "amountPaid": h.amount_paid,
                            "notes": h.notes,
                        }
                        for h in bill.history
                    ],
                }
                for bill in bills
            ],
            "categories": [
                {
                    "id": cat.id,
                    "name": cat.name,
                    "icon": cat.icon,
                    "type": cat.type,
                    "parentId": cat.parent_id,
                    "isSystem": cat.is_system,
                    "displayOrder": cat.display_order,
                }
                for cat in categories
            ],
            "tags": [
                {
                    "id": tag.id,
                    "name": tag.name,
                    "color": tag.color,
                }
                for tag in tags
            ],
            "settings": {
                "currency": settings.currency if settings else "JPY",
                "baseCurrency": settings.base_currency if settings else "JPY",
                "baseDate": settings.base_date if settings else 25,
                "budgetCarryOver": settings.budget_carry_over if settings else False,
                "budgetEmailAlerts": settings.budget_email_alerts if settings else True,
            },
        },
    }


@router.get("/ios")
async def export_ios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all user data as JSON for iOS app import."""
    export_data = _build_export_data(db, current_user.id)

    today = datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"smartmoney-export-{today}.json"
    response = JSONResponse(content=export_data)
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@router.post("/ios/link")
async def export_ios_link(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a temporary download link for iOS export data."""
    export_data = _build_export_data(db, current_user.id)

    token = uuid4().hex
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    file_path = os.path.join(EXPORTS_DIR, f"{token}.json")

    with open(file_path, "w") as f:
        json.dump(export_data, f)

    expires_at = (datetime.utcnow() + timedelta(seconds=LINK_EXPIRY_SECONDS)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    return {
        "url": f"{app_settings.backend_url}/api/export/download/{token}",
        "expiresAt": expires_at,
        "expiresInMinutes": LINK_EXPIRY_SECONDS // 60,
    }


@router.get("/download/{token}")
async def download_export(token: str):
    """Download an exported file by token (no auth, time-limited)."""
    if not re.match(r"^[0-9a-f]{32}$", token):
        raise HTTPException(status_code=404, detail="Not found")

    file_path = os.path.join(EXPORTS_DIR, f"{token}.json")

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Not found")

    file_age = time.time() - os.path.getmtime(file_path)
    if file_age > LINK_EXPIRY_SECONDS:
        os.remove(file_path)
        raise HTTPException(status_code=404, detail="Link expired")

    today = datetime.utcnow().strftime("%Y-%m-%d")
    return FileResponse(
        file_path,
        media_type="application/json",
        filename=f"smartmoney-export-{today}.json",
    )
