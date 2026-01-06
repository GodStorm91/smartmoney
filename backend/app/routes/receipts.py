"""Receipt scanning and upload API routes."""
import os
import uuid
from io import BytesIO

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from PIL import Image

from ..services.receipt_scanner import receipt_scanner, ReceiptData
from ..auth.dependencies import get_current_user
from ..models.user import User


router = APIRouter(prefix="/api/receipts", tags=["receipts"])

# Upload configuration
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/receipts")
MAX_SIZE = 1920  # max width/height in pixels
QUALITY = 80     # JPEG quality


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
