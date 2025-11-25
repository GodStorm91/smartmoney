"""Credit system Pydantic schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Any

from pydantic import BaseModel, Field


class CreditBalanceResponse(BaseModel):
    """Response schema for credit balance."""

    user_id: int
    balance: Decimal = Field(description="Current credit balance")
    lifetime_purchased: Decimal = Field(description="Total credits purchased all-time")
    lifetime_spent: Decimal = Field(description="Total credits spent all-time")
    last_purchase_date: Optional[datetime] = Field(None, description="Last purchase timestamp")
    last_transaction_date: Optional[datetime] = Field(None, description="Last transaction timestamp")

    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    """Request schema for credit purchase."""

    package: str = Field(..., description="Package type: starter, basic, standard, premium")
    payment_method: str = Field(..., description="Payment method: bank_transfer, qr_code")
    return_url: Optional[str] = Field(None, description="URL to redirect after payment")


class BankAccountInfo(BaseModel):
    """Bank account information for payment."""

    bank_name: str
    account_number: str
    account_name: str
    transfer_content: str


class PurchaseResponse(BaseModel):
    """Response schema for credit purchase."""

    purchase_id: str
    package: str
    amount_vnd: int
    credits: Decimal
    payment_url: str
    qr_code: str = Field(description="Base64 encoded QR code image")
    bank_account: BankAccountInfo
    expires_at: datetime
    status: str


class CreditTransactionItem(BaseModel):
    """Single credit transaction item."""

    id: str
    type: str = Field(description="Transaction type: purchase, usage, refund, adjustment")
    amount: Decimal = Field(description="Amount (positive for credits, negative for debits)")
    balance_after: Decimal = Field(description="Balance after this transaction")
    description: str
    reference_id: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionHistoryResponse(BaseModel):
    """Response schema for transaction history."""

    total: int = Field(description="Total number of transactions matching filter")
    page: int = Field(description="Current page number")
    per_page: int = Field(description="Items per page")
    pages: int = Field(description="Total number of pages")
    transactions: list[CreditTransactionItem]
