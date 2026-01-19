"""CSV upload API route."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..services.transaction_service import TransactionService
from ..utils.csv_parser import CSVParseError, parse_csv

router = APIRouter(prefix="/api/upload", tags=["upload"])


class UploadResponse(BaseModel):
    """Schema for upload response."""

    filename: str
    total_rows: int
    created: int
    skipped: int
    message: str


@router.post("/csv", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(..., description="CSV file to upload"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload CSV file and import transactions.

    Expected CSV format:
    - Japanese columns: 日付, 内容, 金額（円）, 大項目, 保有金融機関
    - Or English columns: date, description, amount, category, source

    Returns summary of imported transactions.
    """
    # Validate file extension
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    # File size limit (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 50MB limit"
        )

    # Reset file pointer for parsing
    await file.seek(0)

    try:
        # Parse CSV
        transactions_data = parse_csv(file.file, file.filename)

        # Add user_id to each transaction
        for tx_data in transactions_data:
            tx_data["user_id"] = current_user.id

        # Bulk create transactions
        created, skipped = TransactionService.bulk_create_transactions(
            db, transactions_data
        )

        return {
            "filename": file.filename,
            "total_rows": len(transactions_data),
            "created": created,
            "skipped": skipped,
            "message": f"Successfully imported {created} transactions, skipped {skipped} duplicates"
        }

    except CSVParseError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process CSV: {str(e)}"
        )


@router.get("/history")
async def get_upload_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get upload history (stub for now - returns empty list).

    TODO: Implement actual upload history tracking with:
    - upload_id, filename, upload_date
    - total_rows, created_count, skipped_count
    - status (success/failed), error_message
    """
    # Return empty list for now - this prevents 404 errors
    # In future, create an UploadHistory model to track uploads
    return []
