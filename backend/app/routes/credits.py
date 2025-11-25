"""Credit system API routes."""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..models.credit_purchase import CreditPurchase
from ..schemas.credit import (
    CreditBalanceResponse,
    PurchaseRequest,
    PurchaseResponse,
    TransactionHistoryResponse,
    CreditTransactionItem,
    BankAccountInfo
)
from ..services.credit_service import CreditService, InsufficientCreditsError
from ..services.sepay_service import SepayService, verify_sepay_signature

router = APIRouter(prefix="/api/credits", tags=["credits"])


# Package pricing configuration
CREDIT_PACKAGES = {
    "starter": {"credits": Decimal("50.0000"), "price_vnd": 119000},
    "basic": {"credits": Decimal("120.0000"), "price_vnd": 249000},
    "standard": {"credits": Decimal("300.0000"), "price_vnd": 549000},
    "premium": {"credits": Decimal("1000.0000"), "price_vnd": 1199000}
}


@router.get("/balance", response_model=CreditBalanceResponse)
def get_credit_balance(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get current user's credit balance and statistics.

    Args:
        db: Database session
        current_user: Authenticated user

    Returns:
        Credit balance and lifetime statistics
    """
    credit_service = CreditService(db)
    account = credit_service.get_account(current_user.id)

    return CreditBalanceResponse(
        user_id=current_user.id,
        balance=account.balance,
        lifetime_purchased=account.lifetime_purchased,
        lifetime_spent=account.lifetime_spent,
        last_purchase_date=account.last_purchase_date,
        last_transaction_date=account.last_transaction_date
    )


@router.post("/purchase", response_model=PurchaseResponse, status_code=status.HTTP_200_OK)
def create_purchase(
    request: PurchaseRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Initiate a credit purchase transaction with SePay.

    Args:
        request: Purchase request with package and payment method
        db: Database session
        current_user: Authenticated user

    Returns:
        Purchase details with payment URL and QR code

    Raises:
        HTTPException: If package invalid or SePay integration fails
    """
    # Validate package
    if request.package not in CREDIT_PACKAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid package type. Must be one of: {', '.join(CREDIT_PACKAGES.keys())}"
        )

    package_info = CREDIT_PACKAGES[request.package]

    # Create purchase record
    purchase = CreditPurchase(
        user_id=current_user.id,
        package=request.package,
        amount_vnd=package_info["price_vnd"],
        credits=package_info["credits"],
        payment_method=request.payment_method,
        status="pending",
        expires_at=datetime.utcnow() + timedelta(minutes=15)
    )
    purchase.id = CreditPurchase.generate_id()

    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    # Initialize SePay payment
    try:
        sepay_service = SepayService()
        payment_data = sepay_service.create_payment(
            order_id=purchase.id,
            amount=package_info["price_vnd"],
            description=f"SmartMoney Credit Purchase - {request.package}",
            return_url=request.return_url or "/dashboard/credits"
        )

        # Update purchase with SePay transaction ID
        purchase.sepay_transaction_id = payment_data["transaction_id"]
        db.commit()

        return PurchaseResponse(
            purchase_id=purchase.id,
            package=request.package,
            amount_vnd=package_info["price_vnd"],
            credits=package_info["credits"],
            payment_url=payment_data["payment_url"],
            qr_code=payment_data["qr_code"],
            bank_account=BankAccountInfo(**payment_data["bank_account"]),
            expires_at=purchase.expires_at,
            status="pending"
        )

    except Exception as e:
        purchase.status = "failed"
        purchase.failure_reason = str(e)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"SePay integration error: {str(e)}"
        )


@router.post("/webhooks/sepay")
async def sepay_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)]
):
    """Webhook endpoint for SePay payment confirmations.

    Args:
        request: FastAPI request object
        db: Database session

    Returns:
        Success/failure message

    Raises:
        HTTPException: If signature invalid or purchase not found
    """
    # Verify webhook signature
    signature = request.headers.get("X-Sepay-Signature")
    body = await request.body()

    if not verify_sepay_signature(signature, body):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )

    data = await request.json()

    # Find purchase record
    purchase = db.query(CreditPurchase).filter(
        CreditPurchase.id == data["order_id"]
    ).first()

    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )

    # Prevent duplicate processing
    if purchase.status == "completed":
        return {"success": True, "message": "Already processed"}

    # Update purchase status
    if data["status"] == "success":
        purchase.status = "completed"
        purchase.sepay_transaction_id = data["transaction_id"]
        purchase.completed_at = datetime.fromisoformat(data["payment_time"])

        # Credit user account (ATOMIC TRANSACTION)
        credit_service = CreditService(db)
        credit_service.add_credits(
            user_id=purchase.user_id,
            amount=purchase.credits,
            transaction_type="purchase",
            reference_id=purchase.id,
            description=f"Credit purchase: {purchase.package} package"
        )

        db.commit()

        # TODO: Send confirmation email (async task)
        # background_tasks.add_task(send_purchase_confirmation_email, ...)

        return {"success": True, "message": "Payment processed successfully"}

    else:
        purchase.status = "failed"
        purchase.failure_reason = data.get("error_message", "Payment failed")
        db.commit()

        return {"success": True, "message": "Payment marked as failed"}


@router.get("/transactions", response_model=TransactionHistoryResponse)
def get_transactions(
    page: int = 1,
    per_page: int = 20,
    type: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's credit transaction history with pagination.

    Args:
        page: Page number (default: 1)
        per_page: Items per page (default: 20, max: 100)
        type: Filter by type (purchase, usage, refund, adjustment, all)
        db: Database session
        current_user: Authenticated user

    Returns:
        Paginated transaction history

    Raises:
        HTTPException: If pagination parameters invalid
    """
    # Validate pagination
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be >= 1"
        )

    if per_page < 1 or per_page > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Per page must be between 1 and 100"
        )

    credit_service = CreditService(db)

    # Get total count
    total = credit_service.count_transactions(current_user.id, type)

    # Get transactions
    offset = (page - 1) * per_page
    transactions = credit_service.get_transaction_history(
        user_id=current_user.id,
        transaction_type=type,
        limit=per_page,
        offset=offset
    )

    # Calculate total pages
    pages = (total + per_page - 1) // per_page

    return TransactionHistoryResponse(
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
        transactions=[
            CreditTransactionItem(
                id=t.id,
                type=t.type,
                amount=t.amount,
                balance_after=t.balance_after,
                description=t.description,
                reference_id=t.reference_id,
                extra_data=t.extra_data,
                created_at=t.created_at
            ) for t in transactions
        ]
    )
