"""Proxy purchase routes for purchasing agent workflow."""
import hashlib
import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.proxy import (
    ProxyPurchaseCreate,
    ProxyPurchaseResponse,
    ProxySettleCreate,
    ProxySettleResponse,
    OutstandingClient,
    OutstandingItem,
)

router = APIRouter(prefix="/api/proxy", tags=["proxy"])


@router.post("/purchase", response_model=ProxyPurchaseResponse)
async def create_proxy_purchase(
    data: ProxyPurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a proxy purchase with expense and receivable transactions."""
    # Validate client account (must be receivable type)
    client_account = db.query(Account).filter(
        Account.id == data.client_account_id,
        Account.user_id == current_user.id,
    ).first()
    if not client_account:
        raise HTTPException(status_code=400, detail="Client account not found")
    if client_account.type != "receivable":
        raise HTTPException(status_code=400, detail="Client account must be receivable type")

    # Validate payment account
    payment_account = db.query(Account).filter(
        Account.id == data.payment_account_id,
        Account.user_id == current_user.id,
    ).first()
    if not payment_account:
        raise HTTPException(status_code=400, detail="Payment account not found")

    # Generate unique proxy ID
    proxy_id = str(uuid4())
    month_key = data.purchase_date.strftime("%Y-%m")
    timestamp = datetime.now().timestamp()

    # Calculate client charge and profit
    client_charge_vnd = int(data.markup_price * data.exchange_rate)
    profit_jpy = data.markup_price - data.cost

    # Store charge info in notes as JSON
    charge_info = json.dumps({
        "charge_vnd": client_charge_vnd,
        "exchange_rate": data.exchange_rate,
        "markup_price": data.markup_price,
        "cost": data.cost,
    })
    description = f"Proxy: {client_account.name} - {data.item}"

    # Create expense transaction (from payment account)
    expense_hash = hashlib.sha256(f"{proxy_id}|expense|{timestamp}".encode()).hexdigest()
    expense_tx = Transaction(
        user_id=current_user.id,
        account_id=payment_account.id,
        date=data.purchase_date,
        description=description,
        amount=-data.cost,
        currency=payment_account.currency or "JPY",
        category="Proxy Purchase",
        source=payment_account.name,
        is_income=False,
        is_transfer=False,
        transfer_id=proxy_id,
        transfer_type="proxy_expense",
        month_key=month_key,
        tx_hash=expense_hash,
        notes=data.notes,
    )
    db.add(expense_tx)

    # Create receivable transaction (to client account)
    receivable_hash = hashlib.sha256(f"{proxy_id}|receivable|{timestamp}".encode()).hexdigest()
    receivable_tx = Transaction(
        user_id=current_user.id,
        account_id=client_account.id,
        date=data.purchase_date,
        description=description,
        amount=data.markup_price,
        currency="JPY",
        category="Proxy Purchase",
        source=client_account.name,
        is_income=True,
        is_transfer=False,
        transfer_id=proxy_id,
        transfer_type="proxy_receivable",
        month_key=month_key,
        tx_hash=receivable_hash,
        notes=charge_info,  # Store charge info here
    )
    db.add(receivable_tx)

    db.commit()
    db.refresh(expense_tx)
    db.refresh(receivable_tx)

    return ProxyPurchaseResponse(
        proxy_id=proxy_id,
        expense_transaction_id=expense_tx.id,
        receivable_transaction_id=receivable_tx.id,
        client_charge_vnd=client_charge_vnd,
        profit_jpy=profit_jpy,
    )


@router.get("/outstanding", response_model=list[OutstandingClient])
async def get_outstanding_receivables(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all outstanding proxy receivables grouped by client."""
    # Get all receivable accounts
    receivable_accounts = db.query(Account).filter(
        Account.user_id == current_user.id,
        Account.type == "receivable",
        Account.is_active == True,
    ).all()

    result = []
    for account in receivable_accounts:
        # Get unsettled proxy receivable transactions
        transactions = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.account_id == account.id,
            Transaction.transfer_type == "proxy_receivable",
            Transaction.is_income == True,
        ).order_by(Transaction.date.asc()).all()

        if not transactions:
            continue

        items = []
        total_jpy = 0
        total_vnd = 0
        oldest_date = None

        for tx in transactions:
            # Parse charge info from notes
            try:
                charge_info = json.loads(tx.notes) if tx.notes else {}
            except json.JSONDecodeError:
                charge_info = {}

            charge_vnd = charge_info.get("charge_vnd", int(tx.amount * 170))
            exchange_rate = charge_info.get("exchange_rate", 170.0)

            # Extract item name from description
            item_name = tx.description
            if item_name.startswith("Proxy:"):
                parts = item_name.split(" - ", 1)
                item_name = parts[1] if len(parts) > 1 else item_name

            items.append(OutstandingItem(
                transaction_id=tx.id,
                item=item_name,
                amount_jpy=tx.amount,
                charge_vnd=charge_vnd,
                exchange_rate=exchange_rate,
                date=tx.date,
            ))

            total_jpy += tx.amount
            total_vnd += charge_vnd
            if oldest_date is None or tx.date < oldest_date:
                oldest_date = tx.date

        if items:
            result.append(OutstandingClient(
                client_id=account.id,
                client_name=account.name.replace("Receivable: ", ""),
                total_jpy=total_jpy,
                total_vnd=total_vnd,
                items=items,
                oldest_date=oldest_date,
                item_count=len(items),
            ))

    return result


@router.post("/settle", response_model=ProxySettleResponse)
async def settle_proxy_payment(
    data: ProxySettleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Settle proxy payment - clear receivables and record income."""
    # Validate client account
    client_account = db.query(Account).filter(
        Account.id == data.client_account_id,
        Account.user_id == current_user.id,
        Account.type == "receivable",
    ).first()
    if not client_account:
        raise HTTPException(status_code=400, detail="Client account not found")

    # Validate receive account
    receive_account = db.query(Account).filter(
        Account.id == data.receive_account_id,
        Account.user_id == current_user.id,
    ).first()
    if not receive_account:
        raise HTTPException(status_code=400, detail="Receive account not found")

    # Get transactions to settle
    transactions = db.query(Transaction).filter(
        Transaction.id.in_(data.transaction_ids),
        Transaction.user_id == current_user.id,
        Transaction.account_id == client_account.id,
        Transaction.transfer_type == "proxy_receivable",
    ).all()

    if len(transactions) != len(data.transaction_ids):
        raise HTTPException(status_code=400, detail="Some transactions not found or not settleable")

    # Calculate total to clear
    total_jpy = sum(tx.amount for tx in transactions)

    # Generate settlement ID
    settlement_id = str(uuid4())
    month_key = data.payment_date.strftime("%Y-%m")
    timestamp = datetime.now().timestamp()

    # Get item descriptions for the settlement description
    items = [tx.description.split(" - ", 1)[-1] if " - " in tx.description else tx.description for tx in transactions]
    client_name = client_account.name.replace("Receivable: ", "")
    description = f"Paid: {client_name} - {', '.join(items[:2])}" + (f" +{len(items)-2} more" if len(items) > 2 else "")

    # Create clear receivable transaction (expense from receivable)
    clear_hash = hashlib.sha256(f"{settlement_id}|clear|{timestamp}".encode()).hexdigest()
    clear_tx = Transaction(
        user_id=current_user.id,
        account_id=client_account.id,
        date=data.payment_date,
        description=description,
        amount=-total_jpy,
        currency="JPY",
        category="Proxy Income",
        source=client_account.name,
        is_income=False,
        is_transfer=False,
        transfer_id=settlement_id,
        transfer_type="proxy_clear",
        month_key=month_key,
        tx_hash=clear_hash,
        notes=json.dumps({"settled_tx_ids": data.transaction_ids}),
    )
    db.add(clear_tx)

    # Create income transaction (to receiving account)
    income_hash = hashlib.sha256(f"{settlement_id}|income|{timestamp}".encode()).hexdigest()
    income_tx = Transaction(
        user_id=current_user.id,
        account_id=receive_account.id,
        date=data.payment_date,
        description=description,
        amount=data.vnd_amount,
        currency=receive_account.currency or "VND",
        category="Proxy Income",
        source=receive_account.name,
        is_income=True,
        is_transfer=False,
        transfer_id=settlement_id,
        transfer_type="proxy_income",
        month_key=month_key,
        tx_hash=income_hash,
    )
    db.add(income_tx)

    # Mark original receivable transactions as settled by updating transfer_type
    for tx in transactions:
        tx.transfer_type = "proxy_settled"

    db.commit()
    db.refresh(clear_tx)
    db.refresh(income_tx)

    return ProxySettleResponse(
        settlement_id=settlement_id,
        cleared_transaction_id=clear_tx.id,
        income_transaction_id=income_tx.id,
        items_settled=len(transactions),
    )


@router.get("/client/{client_id}/history")
async def get_client_history(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full proxy history for a client."""
    # Validate client account
    client_account = db.query(Account).filter(
        Account.id == client_id,
        Account.user_id == current_user.id,
    ).first()
    if not client_account:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get all proxy transactions for this client
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.account_id == client_id,
        Transaction.transfer_type.in_(["proxy_receivable", "proxy_settled", "proxy_clear"]),
    ).order_by(Transaction.date.desc()).all()

    return [{
        "id": tx.id,
        "date": tx.date.isoformat(),
        "description": tx.description,
        "amount": tx.amount,
        "type": tx.transfer_type,
        "notes": tx.notes,
    } for tx in transactions]
