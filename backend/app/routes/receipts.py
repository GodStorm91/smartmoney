"""Receipt scanning and upload API routes."""
import os
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.receipt import Receipt
from ..models.transaction import Transaction
from ..models.user import User
from ..services.receipt_scanner import receipt_scanner, ReceiptData
from ..utils.transaction_hasher import generate_tx_hash


router = APIRouter(prefix="/api/receipts", tags=["receipts"])

# Upload configuration
UPLOAD_DIR = Path(os.getenv("RECEIPT_UPLOAD_DIR", "uploads/receipts"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_SIZE = 1920  # max width/height in pixels
QUALITY = 80     # JPEG quality
ALLOWED_TYPES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class ScanRequest(BaseModel):
    """Request model for receipt scanning."""
    image: str  # Base64 encoded image (may include data URL prefix)
    media_type: Optional[str] = None  # Optional MIME type


class ScanResponse(BaseModel):
    """Response model for receipt scanning."""
    success: bool
    data: ReceiptData


@router.post("/scan", response_model=ScanResponse)
async def scan_receipt(
    request: ScanRequest,
    current_user: User = Depends(get_current_user)
):
    """Scan receipt image and extract transaction data.

    Accepts a base64 encoded image (with or without data URL prefix)
    and returns extracted receipt data including amount, date, merchant,
    and suggested category.

    Args:
        request: ScanRequest with base64 image
        current_user: Authenticated user

    Returns:
        ScanResponse with extracted data

    Raises:
        HTTPException: If scanning fails
    """
    try:
        # Parse image data
        image_data = request.image
        media_type = request.media_type or "image/jpeg"

        # Handle data URL format (data:image/jpeg;base64,...)
        if "base64," in image_data:
            # Extract media type from data URL if present
            parts = image_data.split("base64,")
            if len(parts) == 2:
                prefix = parts[0]
                image_data = parts[1]
                # Extract media type from prefix (data:image/jpeg;)
                if prefix.startswith("data:") and ";" in prefix:
                    media_type = prefix[5:prefix.index(";")]

        # Validate image data is not empty
        if not image_data or len(image_data) < 100:
            raise HTTPException(
                status_code=400,
                detail="Invalid image data: image too small or empty"
            )

        # Scan receipt
        result = await receipt_scanner.scan_receipt(image_data, media_type)

        return ScanResponse(success=True, data=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scan receipt: {str(e)}"
        )


class UploadResponse(BaseModel):
    """Response model for receipt upload."""
    receipt_url: str


@router.post("/upload", response_model=UploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload and compress receipt image.

    Accepts an image file, compresses it to JPEG format with max 1920px dimension,
    and stores it on the server.

    Args:
        file: Image file upload
        current_user: Authenticated user

    Returns:
        UploadResponse with the URL path to the stored receipt

    Raises:
        HTTPException: If upload fails or file is not an image
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read and open image
        contents = await file.read()
        img = Image.open(BytesIO(contents))

        # Convert to RGB (handle PNG with alpha, palette images)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        # Resize if too large (maintain aspect ratio)
        if max(img.size) > MAX_SIZE:
            img.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)

        # Create user directory
        user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
        os.makedirs(user_dir, exist_ok=True)

        # Generate unique filename
        filename = f"{uuid.uuid4()}.jpg"
        filepath = os.path.join(user_dir, filename)

        # Save compressed JPEG
        img.save(filepath, "JPEG", quality=QUALITY, optimize=True)

        # Return URL path
        receipt_url = f"/uploads/receipts/{current_user.id}/{filename}"
        return UploadResponse(receipt_url=receipt_url)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload receipt: {str(e)}"
        )


# ============== Database-backed Receipt Management ==============

class ReceiptListResponse(BaseModel):
    """List of receipts response."""
    receipts: list
    total: int


@router.get("/", response_model=ReceiptListResponse)
async def list_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all receipts for the current user."""
    receipts = (
        db.query(Receipt)
        .filter(Receipt.user_id == current_user.id)
        .order_by(Receipt.uploaded_at.desc())
        .all()
    )

    return {
        "receipts": [
            {
                "id": r.id,
                "transaction_id": r.transaction_id,
                "filename": r.filename,
                "original_filename": r.original_filename,
                "file_size": r.file_size,
                "is_processed": r.is_processed,
                "extracted_merchant": r.extracted_merchant,
                "extracted_amount": r.extracted_amount,
                "extracted_date": r.extracted_date,
                "extracted_category": r.extracted_category,
                "uploaded_at": r.uploaded_at.isoformat(),
            }
            for r in receipts
        ],
        "total": len(receipts),
    }


@router.get("/{receipt_id}")
async def get_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get receipt details including OCR data."""
    receipt = (
        db.query(Receipt)
        .filter(Receipt.id == receipt_id, Receipt.user_id == current_user.id)
        .first()
    )

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    return {
        "id": receipt.id,
        "transaction_id": receipt.transaction_id,
        "filename": receipt.filename,
        "original_filename": receipt.original_filename,
        "file_size": receipt.file_size,
        "mime_type": receipt.mime_type,
        "ocr_text": receipt.ocr_text,
        "extracted_merchant": receipt.extracted_merchant,
        "extracted_amount": receipt.extracted_amount,
        "extracted_date": receipt.extracted_date.isoformat() if receipt.extracted_date else None,
        "extracted_category": receipt.extracted_category,
        "is_processed": receipt.is_processed,
        "processing_error": receipt.processing_error,
        "uploaded_at": receipt.uploaded_at.isoformat(),
        "processed_at": receipt.processed_at.isoformat() if receipt.processed_at else None,
    }


class CreateTransactionRequest(BaseModel):
    """Request to create transaction from receipt."""
    date: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_income: bool = False


@router.post("/{receipt_id}/create-transaction")
async def create_transaction_from_receipt(
    receipt_id: int,
    data: Optional[CreateTransactionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a transaction from receipt OCR data."""
    receipt = (
        db.query(Receipt)
        .filter(Receipt.id == receipt_id, Receipt.user_id == current_user.id)
        .first()
    )

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    if not receipt.is_processed:
        raise HTTPException(
            status_code=400,
            detail="Receipt is still processing or OCR failed"
        )

    data = data or CreateTransactionRequest()

    # Parse date
    tx_date = datetime.now().date()
    if data.date:
        try:
            tx_date = datetime.fromisoformat(data.date).date()
        except ValueError:
            pass

    # Use OCR data with user overrides
    description = data.description or receipt.extracted_merchant or f"Receipt #{receipt.id}"
    category = data.category or receipt.extracted_category or "Other"
    amount = receipt.extracted_amount or 0
    is_income = data.is_income

    # Generate transaction hash
    tx_hash = generate_tx_hash(
        str(tx_date),
        amount if is_income else -amount,
        description,
        f"receipt_{receipt.id}",
    )

    # Create transaction
    transaction = Transaction(
        user_id=current_user.id,
        date=tx_date,
        description=description,
        amount=amount if is_income else -amount,
        currency="JPY",
        category=category,
        source="Receipt",
        is_income=is_income,
        is_transfer=False,
        is_adjustment=False,
        month_key=tx_date.strftime("%Y-%m"),
        tx_hash=tx_hash,
        receipt_url=f"/api/receipts/{receipt.id}/download",
    )

    db.add(transaction)

    # Link receipt to transaction
    receipt.transaction_id = transaction.id

    db.commit()
    db.refresh(transaction)

    return {
        "message": "Transaction created successfully",
        "transaction_id": transaction.id,
        "description": transaction.description,
        "amount": abs(transaction.amount),
    }


@router.delete("/{receipt_id}", status_code=204)
async def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a receipt."""
    receipt = (
        db.query(Receipt)
        .filter(Receipt.id == receipt_id, Receipt.user_id == current_user.id)
        .first()
    )

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Delete file
    file_path = UPLOAD_DIR / str(current_user.id) / receipt.filename
    if file_path.exists():
        file_path.unlink()

    db.delete(receipt)
    db.commit()

    return None
