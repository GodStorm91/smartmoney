"""Transaction API routes."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionListResponse,
    TransactionResponse,
    TransactionSummaryResponse,
)
from ..services.transaction_service import TransactionService
from ..utils.transaction_hasher import generate_tx_hash

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new transaction."""
    try:
        # Generate month_key and hash
        tx_data = transaction.model_dump()
        tx_data["user_id"] = current_user.id
        tx_data["month_key"] = transaction.date.strftime("%Y-%m")
        tx_data["tx_hash"] = generate_tx_hash(
            str(transaction.date),
            transaction.amount,
            transaction.description,
            transaction.source,
            current_user.id,
        )

        created = TransactionService.create_transaction(db, tx_data)
        return created

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=TransactionListResponse)
async def get_transactions(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    category: Optional[str] = Query(None, description="Filter by single category (deprecated, use categories)"),
    categories: Optional[str] = Query(None, description="Filter by comma-separated category names"),
    source: Optional[str] = Query(None, description="Filter by source"),
    is_income: Optional[bool] = Query(None, description="Filter by income flag"),
    is_transfer: Optional[bool] = Query(None, description="Filter by transfer flag"),
    account_id: Optional[int] = Query(None, description="Filter by account ID"),
    limit: int = Query(100, ge=1, le=1000, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get filtered transactions with pagination."""
    # Parse categories: support both comma-separated string and single category
    category_list = None
    if categories:
        category_list = [c.strip() for c in categories.split(',') if c.strip()]
    elif category:
        category_list = [category]

    transactions = TransactionService.get_transactions(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        categories=category_list,
        source=source,
        is_income=is_income,
        is_transfer=is_transfer,
        account_id=account_id,
        limit=limit,
        offset=offset,
    )

    total = TransactionService.count_transactions(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        categories=category_list,
        source=source,
        is_income=is_income,
        is_transfer=is_transfer,
        account_id=account_id,
    )

    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/duplicates")
def get_duplicates(
    threshold: float = 0.75,
    date_window: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find fuzzy duplicate transactions."""
    duplicates = TransactionService.find_fuzzy_duplicates(
        db, current_user.id,
        threshold=threshold,
        date_window_days=date_window
    )
    return {"duplicates": duplicates, "count": len(duplicates)}


@router.post("/duplicates/resolve")
def resolve_duplicate(
    action: str,
    keep_id: int,
    remove_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve a duplicate pair by merging or dismissing."""
    if action == "merge":
        tx = TransactionService.get_transaction(db, current_user.id, remove_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        db.delete(tx)
        db.commit()
        return {"success": True, "action": "merged", "kept_id": keep_id, "removed_id": remove_id}
    elif action == "dismiss":
        return {"success": True, "action": "dismissed"}
    else:
        raise HTTPException(status_code=400, detail="Action must be 'merge' or 'dismiss'")


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a transaction by ID."""
    transaction = TransactionService.get_transaction(db, current_user.id, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a transaction."""
    # Filter out None values
    update_data = {k: v for k, v in transaction_update.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    updated = TransactionService.update_transaction(
        db, current_user.id, transaction_id, update_data
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return updated


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a transaction."""
    deleted = TransactionService.delete_transaction(db, current_user.id, transaction_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return None


@router.get("/summary/total", response_model=TransactionSummaryResponse)
async def get_summary(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get transaction summary for a date range."""
    summary = TransactionService.get_summary(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )
    return summary


@router.delete("/cleanup/orphaned")
async def cleanup_orphaned_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete orphaned transactions (account_id is NULL) for current user."""
    from ..models.transaction import Transaction

    orphaned = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.account_id.is_(None),
    ).all()

    deleted_ids = [tx.id for tx in orphaned]
    count = len(orphaned)

    for tx in orphaned:
        db.delete(tx)
    db.commit()

    return {"deleted_count": count, "deleted_ids": deleted_ids}
