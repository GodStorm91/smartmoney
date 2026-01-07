"""Pydantic schemas for receipts."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReceiptUploadResponse(BaseModel):
    """Response after uploading a receipt."""

    id: int
    filename: str
    original_filename: str
    uploaded_at: datetime
    is_processed: bool


class ReceiptResponse(BaseModel):
    """Full receipt response with OCR data."""

    id: int
    user_id: int
    transaction_id: Optional[int] = None
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    ocr_text: Optional[str] = None
    extracted_merchant: Optional[str] = None
    extracted_amount: Optional[int] = None
    extracted_date: Optional[datetime] = None
    extracted_category: Optional[str] = None
    is_processed: bool
    processing_error: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReceiptListResponse(BaseModel):
    """List of receipts response."""

    receipts: list[ReceiptResponse]
    total: int


class ReceiptCreateTransaction(BaseModel):
    """Request to create a transaction from receipt data."""

    date: Optional[datetime] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_income: bool = False
    notes: Optional[str] = None


class ReceiptUpdate(BaseModel):
    """Schema for updating receipt OCR data."""

    extracted_merchant: Optional[str] = None
    extracted_amount: Optional[int] = None
    extracted_date: Optional[datetime] = None
    extracted_category: Optional[str] = None
