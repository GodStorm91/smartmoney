"""Transfer routes for account-to-account transfers."""
import hashlib
from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.account import Account
from ..models.transaction import Transaction
from ..models.user import User
from ..routes.auth import get_current_user
from ..schemas.transfer import (
    ExchangeCreate,
    ExchangeResponse,
    TransferCreate,
    TransferListItem,
    TransferResponse,
)

router = APIRouter(prefix="/api/transfers", tags=["transfers"])


@router.post("/", response_model=TransferResponse)
async def create_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a transfer between two accounts."""
    # Validate accounts exist and belong to user
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
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")

    # Generate unique transfer ID
    transfer_id = str(uuid4())
    month_key = data.date.strftime("%Y-%m")
    timestamp = datetime.now().timestamp()

    # Create outgoing transaction (negative amount from source)
    out_hash = hashlib.sha256(f"{transfer_id}|out|{timestamp}".encode()).hexdigest()
    out_tx = Transaction(
        user_id=current_user.id,
        account_id=from_account.id,
        date=data.date,
        description=data.description or f"Transfer to {to_account.name}",
        amount=-data.from_amount,
        category="Transfer",
        source=from_account.name,
        is_income=False,
        is_transfer=True,
        transfer_id=transfer_id,
        transfer_type="outgoing",
        month_key=month_key,
        tx_hash=out_hash,
    )
    db.add(out_tx)

    # Create incoming transaction (positive amount to destination)
    in_hash = hashlib.sha256(f"{transfer_id}|in|{timestamp}".encode()).hexdigest()
    in_tx = Transaction(
        user_id=current_user.id,
        account_id=to_account.id,
        date=data.date,
        description=data.description or f"Transfer from {from_account.name}",
        amount=data.to_amount,
        category="Transfer",
        source=to_account.name,
        is_income=True,
        is_transfer=True,
        transfer_id=transfer_id,
        transfer_type="incoming",
        month_key=month_key,
        tx_hash=in_hash,
    )
    db.add(in_tx)

    # Create fee transaction if applicable
    fee_tx_id = None
    if data.fee_amount > 0:
        fee_hash = hashlib.sha256(f"{transfer_id}|fee|{timestamp}".encode()).hexdigest()
        fee_tx = Transaction(
            user_id=current_user.id,
            account_id=from_account.id,
            date=data.date,
            description="Transfer fee",
            amount=-data.fee_amount,
            category="Bank Fees",
            source=from_account.name,
            is_income=False,
            is_transfer=False,
            transfer_id=transfer_id,
            transfer_type="fee",
            month_key=month_key,
            tx_hash=fee_hash,
        )
        db.add(fee_tx)
        db.flush()
        fee_tx_id = fee_tx.id

    db.commit()
    db.refresh(out_tx)
    db.refresh(in_tx)

    return TransferResponse(
        transfer_id=transfer_id,
        from_transaction_id=out_tx.id,
        to_transaction_id=in_tx.id,
        fee_transaction_id=fee_tx_id,
    )


@router.delete("/{transfer_id}")
async def delete_transfer(
    transfer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all transactions associated with a transfer."""
    deleted = db.query(Transaction).filter(
        Transaction.transfer_id == transfer_id,
        Transaction.user_id == current_user.id,
    ).delete()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")

    db.commit()
    return {"deleted": deleted, "transfer_id": transfer_id}


@router.get("/", response_model=list[TransferListItem])
async def list_transfers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all transfers for the current user."""
    # Get outgoing transactions (one per transfer)
    outgoing_txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.transfer_type == "outgoing",
    ).order_by(Transaction.date.desc()).all()

    result = []
    for out_tx in outgoing_txs:
        # Get paired incoming transaction
        incoming = db.query(Transaction).filter(
            Transaction.transfer_id == out_tx.transfer_id,
            Transaction.transfer_type == "incoming",
        ).first()

        if not incoming:
            continue

        # Get accounts
        from_account = db.query(Account).filter(Account.id == out_tx.account_id).first()
        to_account = db.query(Account).filter(Account.id == incoming.account_id).first()

        if not from_account or not to_account:
            continue

        # Get fee if exists
        fee = db.query(Transaction).filter(
            Transaction.transfer_id == out_tx.transfer_id,
            Transaction.transfer_type == "fee",
        ).first()

        result.append(TransferListItem(
            transfer_id=out_tx.transfer_id,
            from_account_id=from_account.id,
            from_account_name=from_account.name,
            from_currency=from_account.currency,
            to_account_id=to_account.id,
            to_account_name=to_account.name,
            to_currency=to_account.currency,
            from_amount=abs(out_tx.amount),
            to_amount=incoming.amount,
            fee_amount=abs(fee.amount) if fee else 0,
            date=out_tx.date,
            description=out_tx.description,
        ))

    return result


@router.post("/exchange", response_model=ExchangeResponse)
async def create_exchange(
    data: ExchangeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create currency exchange with bidirectionally linked transactions.

    Creates two linked transactions:
    - Outgoing: negative amount from source account (source currency)
    - Incoming: positive amount to destination account (target currency)

    Optionally links to an existing income transaction for 3-way chain tracking.
    """
    # Validate accounts exist and belong to user
    from_account = db.query(Account).filter(
        Account.id == data.from_account_id,
        Account.user_id == current_user.id,
    ).first()
    to_account = db.query(Account).filter(
        Account.id == data.to_account_id,
        Account.user_id == current_user.id,
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
            Transaction.is_income == True,
        ).first()
        if not linked_income:
            raise HTTPException(status_code=400, detail="Income transaction not found")
        # Prevent overwriting existing links
        if linked_income.linked_transaction_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Income transaction already linked to another exchange",
            )

    # Defensive check for division (Pydantic validates gt=0, but be safe)
    if data.from_amount <= 0:
        raise HTTPException(status_code=400, detail="from_amount must be positive")

    # Calculate exchange rate if not provided
    rate = data.exchange_rate or (data.to_amount / data.from_amount)
    rate_decimal = Decimal(str(rate))

    # Generate unique transfer ID
    transfer_id = str(uuid4())
    month_key = data.date.strftime("%Y-%m")
    timestamp = datetime.now().timestamp()

    description = data.notes or f"Exchange {from_account.currency} to {to_account.currency}"

    # Create outgoing transaction (negative amount from source)
    out_hash = hashlib.sha256(
        f"{transfer_id}|exchange|out|{timestamp}".encode()
    ).hexdigest()
    out_tx = Transaction(
        user_id=current_user.id,
        account_id=from_account.id,
        date=data.date,
        description=description,
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

    # Create incoming transaction (positive amount to destination)
    in_hash = hashlib.sha256(
        f"{transfer_id}|exchange|in|{timestamp}".encode()
    ).hexdigest()
    in_tx = Transaction(
        user_id=current_user.id,
        account_id=to_account.id,
        date=data.date,
        description=description,
        amount=data.to_amount,
        currency=to_account.currency,
        category="Exchange",
        source=to_account.name,
        is_income=True,
        is_transfer=True,
        transfer_id=transfer_id,
        transfer_type="incoming",
        exchange_rate=rate_decimal,
        linked_transaction_id=out_tx.id,  # Link incoming -> outgoing
        month_key=month_key,
        tx_hash=in_hash,
    )
    db.add(in_tx)
    db.flush()

    # Bidirectional link: outgoing -> incoming
    out_tx.linked_transaction_id = in_tx.id

    # Optional: link income to outgoing (3-way chain: income -> out -> in)
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
