"""PayPay screenshot OCR using Claude Vision API."""
import json
from datetime import date

from anthropic import Anthropic

from ..config import settings
from .transaction_hasher import generate_tx_hash
from .category_mapper import map_category


PAYPAY_OCR_PROMPT = """You are a PayPay transaction history parser. Extract ALL visible transactions from this PayPay app screenshot.

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "date": "YYYY-MM-DD",
    "description": "merchant/store name",
    "amount": -1234,
    "category": "食費"
  }
]

RULES:
- date: Transaction date in YYYY-MM-DD format. If unclear, use null.
- description: Merchant/store name exactly as shown
- amount: Integer in JPY. NEGATIVE for payments/expenses, POSITIVE for cashback/refunds/deposits
- category: Suggest ONE Japanese category: 食費, 交通, 日用品, 娯楽, 通信, 医療, 住宅, 教育, その他

Extract EVERY transaction visible in the image. If no transactions found, return empty array []."""


class PayPayOCRService:
    """Service for extracting transactions from PayPay screenshots."""

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-haiku-20241022"

    def extract_transactions(
        self,
        image_base64: str,
        media_type: str,
        user_id: int
    ) -> list[dict]:
        """Extract transactions from PayPay screenshot.

        Args:
            image_base64: Base64 encoded image (no data URL prefix)
            media_type: MIME type (image/jpeg or image/png)
            user_id: User ID for transaction records

        Returns:
            List of transaction dicts ready for bulk_create
        """
        # Call Claude Vision API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
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
                        {"type": "text", "text": PAYPAY_OCR_PROMPT}
                    ]
                }
            ]
        )

        # Parse response
        response_text = response.content[0].text.strip()
        raw_transactions = self._parse_json_response(response_text)

        # Transform to transaction format
        transactions = []
        for tx in raw_transactions:
            if not tx.get("amount"):
                continue  # Skip if no amount

            # Handle null date
            tx_date = tx.get("date")
            if not tx_date:
                tx_date = date.today().isoformat()

            description = tx.get("description", "PayPay Transaction")
            amount = tx.get("amount", 0)
            category_jp = tx.get("category", "その他")

            # Map Japanese category to English
            category_en = map_category(category_jp)

            # Determine if income (positive amount)
            is_income = amount > 0

            # Generate tx_hash for duplicate detection
            tx_hash = generate_tx_hash(
                date_str=tx_date,
                amount=abs(amount),
                description=description,
                source="PayPay"
            )

            transactions.append({
                "date": tx_date,
                "description": description,
                "amount": abs(amount),  # Store as positive, use is_income flag
                "category": category_en,
                "source": "PayPay",
                "is_income": is_income,
                "is_transfer": False,
                "is_adjustment": False,
                "tx_hash": tx_hash,
                "user_id": user_id,
                "month_key": tx_date[:7]  # YYYY-MM
            })

        return transactions

    def _parse_json_response(self, response_text: str) -> list[dict]:
        """Parse Claude response into transaction list."""
        text = response_text.strip()

        # Handle markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            start_idx = 1
            end_idx = len(lines)
            for i, line in enumerate(lines[1:], 1):
                if line.strip() == "```":
                    end_idx = i
                    break
            text = "\n".join(lines[start_idx:end_idx])
            if text.startswith("json"):
                text = text[4:].strip()

        # Find array bounds
        start = text.find("[")
        end = text.rfind("]") + 1
        if start == -1 or end == 0:
            return []

        return json.loads(text[start:end])


# Singleton
paypay_ocr = PayPayOCRService()
