"""Transaction API routes."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.transaction import (
    TransactionCreate,
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
):
    """Create a new transaction."""
    try:
        # Generate month_key and hash
        tx_data = transaction.model_dump()
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
    category: Optional[str] = Query(None, description="Filter by category"),
    source: Optional[str] = Query(None, description="Filter by source"),
    is_income: Optional[bool] = Query(None, description="Filter by income flag"),
    is_transfer: Optional[bool] = Query(None, description="Filter by transfer flag"),
    limit: int = Query(100, ge=1, le=1000, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    """Get filtered transactions with pagination."""
    transactions = TransactionService.get_transactions(
        db=db,
        start_date=start_date,
        end_date=end_date,
        category=category,
        source=source,
        is_income=is_income,
        is_transfer=is_transfer,
        limit=limit,
        offset=offset,
    )

    total = TransactionService.count_transactions(
        db=db,
        start_date=start_date,
        end_date=end_date,
        category=category,
        source=source,
        is_income=is_income,
        is_transfer=is_transfer,
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
):
    """Get a transaction by ID."""
    transaction = TransactionService.get_transaction(db, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.get("/summary/total", response_model=TransactionSummaryResponse)
async def get_summary(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
):
    """Get transaction summary for a date range."""
    summary = TransactionService.get_summary(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )
    return summary
