"""Transaction API routes."""
import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.category import Category
from ..models.transaction import Transaction
from ..models.user import User
from ..schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionListResponse,
    TransactionResponse,
    TransactionSummaryResponse,
)
from ..services.category_rule_service import CategoryRuleService
from ..services.transaction_service import TransactionService
from ..utils.merchant_normalizer import normalize_merchant
from ..utils.transaction_hasher import generate_tx_hash

logger = logging.getLogger(__name__)

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

        # Learn-on-save: create keyword rule from this transaction
        if not transaction.is_transfer:
            try:
                CategoryRuleService.learn_from_transaction(
                    db, current_user.id, transaction.description, transaction.category
                )
            except Exception:
                logger.warning("learn_from_transaction failed", exc_info=True)

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


@router.get("/suggestions")
async def get_transaction_suggestions(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=5, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get autocomplete suggestions based on transaction history and keyword rules."""
    auto_category = None

    # 1. Query past transactions matching description
    results = (
        db.query(
            Transaction.description,
            Transaction.category,
            Transaction.is_income,
            func.count().label("count"),
            func.avg(func.abs(Transaction.amount)).label("avg_amount"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.is_transfer == False,
            Transaction.description.ilike(f"%{q.replace('%', '').replace('_', '')}%"),
        )
        .group_by(Transaction.description, Transaction.category, Transaction.is_income)
        .order_by(func.count().desc())
        .limit(limit)
        .all()
    )

    suggestions = [
        {
            "description": r.description,
            "category": r.category,
            "is_income": r.is_income,
            "count": r.count,
            "amount": int(r.avg_amount or 0),
        }
        for r in results
    ]

    # Calculate auto_category from history matches
    if suggestions:
        total_count = sum(s["count"] for s in suggestions)
        top = suggestions[0]  # Already sorted by count desc
        confidence = top["count"] / total_count if total_count > 0 else 0
        parent_name = _lookup_parent_category(db, current_user.id, top["category"])
        auto_category = {
            "category": top["category"],
            "parent_category": parent_name,
            "is_income": top["is_income"],
            "confidence": round(confidence, 2),
            "source": "history",
        }

    # 2. Keyword rule fallback — if no history matches, check rules
    if not suggestions:
        rules = CategoryRuleService.list_rules(db, current_user.id, active_only=True)
        matched_rule = _find_matching_rule(q, rules)
        if matched_rule:
            matched_category = matched_rule.category
            # Seeded rules (priority>=10) get 0.8, learned rules get 0.7
            confidence = 0.8 if matched_rule.priority >= 10 else 0.7
            parent_name = _lookup_parent_category(db, current_user.id, matched_category)
            suggestions.append({
                "description": q,
                "category": matched_category,
                "is_income": False,
                "count": 0,
                "amount": 0,
            })
            auto_category = {
                "category": matched_category,
                "parent_category": parent_name,
                "is_income": False,
                "confidence": confidence,
                "source": "rule",
            }

    # 2.5 Fuzzy merchant match — if still no auto_category, try normalized merchant
    if not auto_category:
        try:
            auto_category = _fuzzy_merchant_match(db, current_user.id, q)
        except Exception:
            logger.warning("fuzzy merchant match failed", exc_info=True)

    return {"suggestions": suggestions, "auto_category": auto_category}


def _fuzzy_merchant_match(
    db: Session, user_id: int, description: str
) -> dict | None:
    """Layer 2.5: Match by normalized merchant name against recent transactions."""
    from datetime import timedelta

    normalized_input = normalize_merchant(description)
    if not normalized_input or len(normalized_input) < 2:
        return None

    cutoff = date.today() - timedelta(days=180)
    recent_txs = (
        db.query(Transaction.description, Transaction.category, Transaction.is_income)
        .filter(
            Transaction.user_id == user_id,
            Transaction.is_transfer == False,
            Transaction.category != "Other",
            Transaction.date >= cutoff,
        )
        .limit(500)
        .all()
    )

    # Group by category, count normalized matches
    category_counts: dict[str, int] = {}
    category_income: dict[str, bool] = {}
    for tx in recent_txs:
        if normalize_merchant(tx.description) == normalized_input:
            category_counts[tx.category] = category_counts.get(tx.category, 0) + 1
            category_income[tx.category] = tx.is_income

    if not category_counts:
        return None

    best_cat = max(category_counts, key=category_counts.get)  # type: ignore[arg-type]
    parent_name = _lookup_parent_category(db, user_id, best_cat)
    return {
        "category": best_cat,
        "parent_category": parent_name,
        "is_income": category_income[best_cat],
        "confidence": 0.75,
        "source": "fuzzy",
    }


def _lookup_parent_category(db: Session, user_id: int, category_name: str) -> str | None:
    """Find the parent category name for a given child category."""
    child = db.query(Category).filter(
        Category.name == category_name,
        Category.parent_id.isnot(None),
        (Category.is_system == True) | (Category.user_id == user_id),
    ).first()

    if child and child.parent:
        return child.parent.name
    return None


def _find_matching_rule(description: str, rules: list) -> object | None:
    """Find the first matching rule for a description. Returns the rule object."""
    description_lower = description.lower()
    for rule in rules:
        if not rule.is_active:
            continue
        keyword_lower = rule.keyword.lower()
        if rule.match_type == "contains" and keyword_lower in description_lower:
            return rule
        elif rule.match_type == "starts_with" and description_lower.startswith(keyword_lower):
            return rule
        elif rule.match_type == "exact" and description_lower == keyword_lower:
            return rule
    return None


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

    # Learn-on-save: create keyword rule if category was set
    if "category" in update_data and not updated.is_transfer:
        try:
            CategoryRuleService.learn_from_transaction(
                db, current_user.id, updated.description, updated.category
            )
        except Exception:
            logger.warning("learn_from_transaction failed", exc_info=True)

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
