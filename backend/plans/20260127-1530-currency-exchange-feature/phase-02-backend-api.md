# Phase 2: Backend API

**Status:** PENDING | **Est. Effort:** 2 hours

---

## Context

- [Main Plan](./plan.md) | [Phase 1: Database](./phase-01-database-migration.md)
- Depends on: Phase 1 completion

## Overview

New endpoint `POST /api/transfers/exchange` creates bidirectionally-linked exchange transaction pairs with optional income linking.

## Requirements

1. Create 2 transactions: outgoing (source currency) + incoming (target currency)
2. Bidirectional linking via `linked_transaction_id`
3. Store `exchange_rate` on both transactions
4. Optional: link to existing income transaction (3-way chain)
5. Validate accounts belong to user, have different currencies

## Related Files

| File | Action |
|------|--------|
| `backend/app/routes/transfers.py` | Add exchange endpoint |
| `backend/app/schemas/transfer.py` | Add ExchangeCreate/Response schemas |

## Schema Design

**File:** `backend/app/schemas/transfer.py` - Add:

```python
class ExchangeCreate(BaseModel):
    """Schema for creating a currency exchange."""
    date: datetime.date
    from_account_id: int = Field(..., description="Source account ID")
    from_amount: int = Field(..., gt=0, description="Amount in source currency (smallest unit)")
    to_account_id: int = Field(..., description="Destination account ID")
    to_amount: int = Field(..., gt=0, description="Amount in target currency (smallest unit)")
    exchange_rate: Optional[float] = Field(None, description="Rate (auto-calc if not provided)")
    link_to_transaction_id: Optional[int] = Field(None, description="Link to existing income tx")
    notes: Optional[str] = Field(None, max_length=500)


class ExchangeResponse(BaseModel):
    """Response after creating exchange."""
    transfer_id: str
    from_transaction_id: int
    to_transaction_id: int
    exchange_rate: float
    linked_income_id: Optional[int] = None
```

## Endpoint Implementation

**File:** `backend/app/routes/transfers.py` - Add after existing endpoints:

```python
from decimal import Decimal

@router.post("/exchange", response_model=ExchangeResponse)
async def create_exchange(
    data: ExchangeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create currency exchange with linked transactions."""
    # Validate accounts
    from_account = db.query(Account).filter(
        Account.id == data.from_account_id,
        Account.user_id == current_user.id
    ).first()
    to_account = db.query(Account).filter(
        Account.id == data.to_account_id,
        Account.user_id == current_user.id
    ).first()

    if not from_account:
        raise HTTPException(status_code=400, detail="Source account not found")
    if not to_account:
        raise HTTPException(status_code=400, detail="Destination account not found")
    if from_account.id == to_account.id:
        raise HTTPException(status_code=400, detail="Cannot exchange to same account")

    # Validate link_to_transaction if provided
    linked_income = None
    if data.link_to_transaction_id:
        linked_income = db.query(Transaction).filter(
            Transaction.id == data.link_to_transaction_id,
            Transaction.user_id == current_user.id,
            Transaction.is_income == True
        ).first()
        if not linked_income:
            raise HTTPException(status_code=400, detail="Income transaction not found")

    # Calculate exchange rate if not provided
    rate = data.exchange_rate or (data.to_amount / data.from_amount)
    rate_decimal = Decimal(str(rate))

    # Generate IDs
    transfer_id = str(uuid4())
    month_key = data.date.strftime("%Y-%m")
    timestamp = datetime.now().timestamp()

    # Create outgoing transaction
    out_hash = hashlib.sha256(f"{transfer_id}|exchange|out|{timestamp}".encode()).hexdigest()
    out_tx = Transaction(
        user_id=current_user.id,
        account_id=from_account.id,
        date=data.date,
        description=data.notes or f"Exchange {from_account.currency} to {to_account.currency}",
        amount=-data.from_amount,
        currency=from_account.currency,
        category="Exchange",
        source=from_account.name,
        is_income=False,
        is_transfer=True,
        transfer_id=transfer_id,
        transfer_type="outgoing",
        exchange_rate=rate_decimal,
        month_key=month_key,
        tx_hash=out_hash,
    )
    db.add(out_tx)
    db.flush()  # Get out_tx.id

    # Create incoming transaction
    in_hash = hashlib.sha256(f"{transfer_id}|exchange|in|{timestamp}".encode()).hexdigest()
    in_tx = Transaction(
        user_id=current_user.id,
        account_id=to_account.id,
        date=data.date,
        description=data.notes or f"Exchange {from_account.currency} to {to_account.currency}",
        amount=data.to_amount,
        currency=to_account.currency,
        category="Exchange",
        source=to_account.name,
        is_income=True,
        is_transfer=True,
        transfer_id=transfer_id,
        transfer_type="incoming",
        exchange_rate=rate_decimal,
        linked_transaction_id=out_tx.id,  # Link to outgoing
        month_key=month_key,
        tx_hash=in_hash,
    )
    db.add(in_tx)
    db.flush()

    # Bidirectional link: outgoing -> incoming
    out_tx.linked_transaction_id = in_tx.id

    # Optional: link income to outgoing (3-way chain)
    if linked_income:
        linked_income.linked_transaction_id = out_tx.id

    db.commit()

    return ExchangeResponse(
        transfer_id=transfer_id,
        from_transaction_id=out_tx.id,
        to_transaction_id=in_tx.id,
        exchange_rate=float(rate_decimal),
        linked_income_id=linked_income.id if linked_income else None,
    )
```

## Todo List

- [ ] Add ExchangeCreate, ExchangeResponse schemas
- [ ] Implement /exchange endpoint
- [ ] Add import for Decimal
- [ ] Write unit tests for exchange endpoint
- [ ] Test bidirectional linking
- [ ] Test 3-way income linking

## Success Criteria

- [ ] Endpoint creates 2 transactions with correct currencies/amounts
- [ ] Both transactions have same exchange_rate
- [ ] linked_transaction_id is bidirectional (out->in, in->out)
- [ ] Optional income linking works
- [ ] Validation rejects invalid accounts/transactions
- [ ] Existing transfer endpoints unaffected
