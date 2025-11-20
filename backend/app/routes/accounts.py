"""Account API routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.account import (
    AccountCreate,
    AccountResponse,
    AccountUpdate,
    AccountWithBalanceResponse,
)
from ..services.account_service import AccountService

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new account."""
    try:
        created = AccountService.create_account(db, account.model_dump())
        return created
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[AccountWithBalanceResponse])
async def get_all_accounts(
    include_inactive: bool = Query(False, description="Include inactive accounts"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all accounts with calculated balances."""
    accounts = AccountService.get_all_accounts(db, include_inactive=include_inactive)

    # Enrich with balance and transaction count
    enriched = []
    for account in accounts:
        account_dict = {
            "id": account.id,
            "name": account.name,
            "type": account.type,
            "initial_balance": account.initial_balance,
            "initial_balance_date": account.initial_balance_date,
            "is_active": account.is_active,
            "currency": account.currency,
            "notes": account.notes,
            "created_at": account.created_at,
            "updated_at": account.updated_at,
            "current_balance": AccountService.calculate_balance(db, account.id),
            "transaction_count": AccountService.get_transaction_count(db, account.id),
        }
        enriched.append(account_dict)

    return enriched


@router.get("/{account_id}", response_model=AccountWithBalanceResponse)
async def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get an account by ID with calculated balance."""
    account = AccountService.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Enrich with balance and transaction count
    account_dict = {
        "id": account.id,
        "name": account.name,
        "type": account.type,
        "initial_balance": account.initial_balance,
        "initial_balance_date": account.initial_balance_date,
        "is_active": account.is_active,
        "currency": account.currency,
        "notes": account.notes,
        "created_at": account.created_at,
        "updated_at": account.updated_at,
        "current_balance": AccountService.calculate_balance(db, account_id),
        "transaction_count": AccountService.get_transaction_count(db, account_id),
    }

    return account_dict


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    account_update: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an account with optional balance adjustment."""
    # Validation: Can't set both balance fields
    update_data = account_update.model_dump(exclude_unset=True)
    if update_data.get("initial_balance") is not None and update_data.get("desired_current_balance") is not None:
        raise HTTPException(
            status_code=400,
            detail="Cannot set both initial_balance and desired_current_balance"
        )

    updated = AccountService.update_account(db, account_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Account not found")
    return updated


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete an account (set is_active=False)."""
    deleted = AccountService.delete_account(db, account_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Account not found")
    return None


@router.get("/{account_id}/transactions")
async def get_account_transactions(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all transactions for an account."""
    account = AccountService.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Return transactions through relationship
    return account.transactions
