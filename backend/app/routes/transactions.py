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
    TransactionSuggestion,
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
        )

        created = TransactionService.create_transaction(db, tx_data)
        return created

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=TransactionListResponse)
async def get_transactions(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    categories: Optional[str] = Query(None, description="Comma-separated category names"),
    source: Optional[str] = Query(None, description="Filter by source"),
    is_income: Optional[bool] = Query(None, description="Filter by income flag"),
    is_transfer: Optional[bool] = Query(None, description="Filter by transfer flag"),
    search: Optional[str] = Query(None, min_length=2, max_length=100, description="Search description"),
    limit: int = Query(100, ge=1, le=5000, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get filtered transactions with pagination."""
    # Parse comma-separated categories into list
    category_list = [c.strip() for c in categories.split(',')] if categories else None

    transactions = TransactionService.get_transactions(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        categories=category_list,
        source=source,
        is_income=is_income,
        is_transfer=is_transfer,
        search=search,
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
        search=search,
    )

    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


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


@router.delete("/bulk/delete", status_code=200)
async def bulk_delete_transactions(
    transaction_ids: list[int] = Query(..., description="Transaction IDs to delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple transactions at once."""
    deleted_count = TransactionService.bulk_delete(db, current_user.id, transaction_ids)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="No transactions found to delete")
    return {"deleted": deleted_count}


@router.patch("/bulk/category")
async def bulk_update_category(
    transaction_ids: list[int] = Query(..., description="Transaction IDs to update"),
    category: str = Query(..., min_length=1, max_length=100, description="New category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update category for multiple transactions."""
    updated_count = TransactionService.bulk_update_category(
        db, current_user.id, transaction_ids, category
    )
    if updated_count == 0:
        raise HTTPException(status_code=404, detail="No transactions found to update")
    return {"updated": updated_count, "category": category}


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


@router.get("/suggestions", response_model=list[TransactionSuggestion])
async def get_suggestions(
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
    limit: int = Query(5, ge=1, le=10, description="Max suggestions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get autocomplete suggestions based on recent transactions."""
    suggestions = TransactionService.get_suggestions(
        db=db,
        user_id=current_user.id,
        query=q,
        limit=limit,
    )
    return suggestions
