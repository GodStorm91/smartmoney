"""Receipt scanner service using Claude Vision API."""
import json
import base64
from typing import Optional, Any

from anthropic import Anthropic
from pydantic import BaseModel

from ..config import settings


class ReceiptData(BaseModel):
    """Extracted receipt data."""
    amount: Optional[int] = None
    date: Optional[str] = None  # YYYY-MM-DD
    merchant: Optional[str] = None
    category: Optional[str] = None
    confidence: dict = {}
    warnings: list = []


class ReceiptScannerService:
    """Service for scanning receipts using Claude Vision API."""

    RECEIPT_PROMPT = """You are a Japanese receipt parser. Extract the following from this receipt image:

1. total_amount: The final total (合計, お支払い, 計, 税込, お買上合計) in JPY as integer. Look for the largest/final amount at the bottom.
2. date: Transaction date in YYYY-MM-DD format. Look for 日付, 年月日, or date patterns like 2024/12/05 or 令和6年12月5日.
3. merchant: Store/shop name (店舗名). Usually at the top of receipt or in the header.
4. category: Suggest one of: Food, Transport, Shopping, Entertainment, Utilities, Healthcare, Other

Return ONLY valid JSON (no markdown, no explanation):
{
  "amount": <integer or null>,
  "date": "<YYYY-MM-DD or null>",
  "merchant": "<string or null>",
  "category": "<string>",
  "confidence": {
    "amount": <0.0-1.0>,
    "date": <0.0-1.0>,
    "merchant": <0.0-1.0>
  }
}

If you cannot detect a field, set it to null and confidence to 0.
Do not include any explanation, only the JSON object."""

    def __init__(self):
        """Initialize Claude client."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-haiku-20241022"  # Cheaper, fast, good for receipts

    async def scan_receipt(self, image_base64: str, media_type: str = "image/jpeg") -> ReceiptData:
        """Scan receipt image and extract transaction data.

        Args:
            image_base64: Base64 encoded image data (without data URL prefix)
            media_type: MIME type of the image (image/jpeg, image/png, etc.)

        Returns:
            ReceiptData with extracted fields and confidence scores
        """
        try:
            # Call Claude API with vision
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": self.RECEIPT_PROMPT
                            }
                        ]
                    }
                ]
            )

            # Parse response
            response_text = response.content[0].text.strip()
            return self._parse_response(response_text)

        except Exception as e:
            # Return empty data with error warning
            return ReceiptData(
                warnings=[f"Failed to scan receipt: {str(e)}"]
            )

    def _parse_response(self, response_text: str) -> ReceiptData:
        """Parse Claude's response into ReceiptData.

        Args:
            response_text: Raw text response from Claude

        Returns:
            Parsed ReceiptData
        """
        try:
            # Handle potential markdown code blocks
            text = response_text.strip()
            if text.startswith("```"):
                # Remove markdown code block
                lines = text.split("\n")
                # Find content between ``` markers
                start_idx = 1 if lines[0].startswith("```") else 0
                end_idx = len(lines)
                for i, line in enumerate(lines[1:], 1):
                    if line.strip() == "```":
                        end_idx = i
                        break
                text = "\n".join(lines[start_idx:end_idx])
                # Remove "json" identifier if present
                if text.startswith("json"):
                    text = text[4:].strip()

            # Parse JSON
            data = json.loads(text)

            # Build warnings based on confidence
            warnings = []
            confidence = data.get("confidence", {})

            if confidence.get("amount", 0) < 0.8 and data.get("amount") is not None:
                warnings.append("Amount detection confidence low")
            if confidence.get("date", 0) < 0.8 and data.get("date") is not None:
                warnings.append("Date detection confidence low")
            if confidence.get("merchant", 0) < 0.8 and data.get("merchant") is not None:
                warnings.append("Merchant detection confidence low")

            return ReceiptData(
                amount=data.get("amount"),
                date=data.get("date"),
                merchant=data.get("merchant"),
                category=data.get("category", "Other"),
                confidence=confidence,
                warnings=warnings
            )

        except json.JSONDecodeError as e:
            return ReceiptData(
                warnings=[f"Failed to parse receipt data: {str(e)}"]
            )


# Singleton instance
receipt_scanner = ReceiptScannerService()
