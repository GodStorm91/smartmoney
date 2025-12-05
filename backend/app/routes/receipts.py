"""Receipt scanning API routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..services.receipt_scanner import receipt_scanner, ReceiptData
from ..auth.dependencies import get_current_user
from ..models.user import User


router = APIRouter(prefix="/api/receipts", tags=["receipts"])


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
