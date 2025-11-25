"""SePay payment gateway integration service."""
import os
import hmac
import hashlib
import requests
from typing import Dict, Any

from ..config import settings


class SepayService:
    """Service for SePay payment gateway integration (Vietnamese payments)."""

    def __init__(self):
        """Initialize SePay service with configuration."""
        self.api_key = os.getenv("SEPAY_API_KEY")
        self.secret_key = os.getenv("SEPAY_SECRET_KEY")
        self.base_url = os.getenv("SEPAY_BASE_URL", "https://api.sepay.vn")
        self.webhook_url = os.getenv(
            "SEPAY_WEBHOOK_URL",
            f"{settings.backend_url}/api/credits/webhooks/sepay"
        )

    def create_payment(
        self,
        order_id: str,
        amount: int,
        description: str,
        return_url: str
    ) -> Dict[str, Any]:
        """
        Create a new payment transaction with SePay.

        Args:
            order_id: Unique purchase ID (e.g., PUR_20251125_ABC123)
            amount: Amount in VND (integer)
            description: Payment description
            return_url: URL to redirect after payment

        Returns:
            Dict with payment_url, qr_code, bank_account, transaction_id

        Raises:
            Exception: If SePay API returns an error
        """
        endpoint = f"{self.base_url}/v2/payment/create"

        payload = {
            "order_id": order_id,
            "amount": amount,
            "description": description,
            "return_url": return_url,
            "webhook_url": self.webhook_url,
            "expires_in": 900  # 15 minutes
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()

            return {
                "transaction_id": data["transaction_id"],
                "payment_url": data["payment_url"],
                "qr_code": data["qr_code"],  # Base64 encoded QR image
                "bank_account": {
                    "bank_name": data["bank_name"],
                    "account_number": data["account_number"],
                    "account_name": data["account_name"],
                    "transfer_content": data["transfer_content"]
                }
            }

        except requests.exceptions.RequestException as e:
            raise Exception(f"SePay API error: {str(e)}") from e

    def verify_webhook_signature(self, signature: str, body: bytes) -> bool:
        """
        Verify SePay webhook signature for security.

        Args:
            signature: X-Sepay-Signature header value (format: sha256=abc123...)
            body: Raw request body bytes

        Returns:
            True if signature valid, False otherwise
        """
        if not signature or not signature.startswith("sha256="):
            return False

        if not self.secret_key:
            raise ValueError("SEPAY_SECRET_KEY not configured")

        expected_signature = signature.split("=")[1]

        # Calculate HMAC-SHA256
        calculated_hmac = hmac.new(
            self.secret_key.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(calculated_hmac, expected_signature)

    def check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Check payment status from SePay API.
        Useful for manual reconciliation or status checks.

        Args:
            transaction_id: SePay transaction ID

        Returns:
            Dict with payment status information

        Raises:
            Exception: If SePay API returns an error
        """
        endpoint = f"{self.base_url}/v2/payment/status/{transaction_id}"

        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        try:
            response = requests.get(endpoint, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise Exception(f"SePay API error: {str(e)}") from e


def verify_sepay_signature(signature: str, body: bytes) -> bool:
    """
    Helper function for webhook signature verification.
    Instantiates SepayService and verifies signature.

    Args:
        signature: X-Sepay-Signature header value
        body: Raw request body bytes

    Returns:
        True if signature valid, False otherwise
    """
    service = SepayService()
    return service.verify_webhook_signature(signature, body)
