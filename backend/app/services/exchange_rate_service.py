"""Exchange rate service for fetching and updating currency rates."""
import logging
from datetime import datetime
from typing import Any

import requests
from sqlalchemy.orm import Session

from ..models.exchange_rate import ExchangeRate

logger = logging.getLogger(__name__)

EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest/JPY"
SUPPORTED_CURRENCIES = ["JPY", "USD", "VND"]
API_TIMEOUT_SECONDS = 5


class ExchangeRateService:
    """Service for exchange rate operations."""

    @staticmethod
    def fetch_and_update_rates(db: Session) -> dict[str, Any]:
        """Fetch rates from API and update database.

        Args:
            db: Database session

        Returns:
            {
                "success": bool,
                "updated_count": int,
                "timestamp": datetime,
                "source": "api" | "cache"
            }
        """
        try:
            # Fetch from API
            response = requests.get(EXCHANGE_API_URL, timeout=API_TIMEOUT_SECONDS)
            response.raise_for_status()
            data = response.json()

            # Validate response structure
            if "rates" not in data:
                raise ValueError("Invalid API response: missing 'rates' field")

            rates = data["rates"]
            updated_count = 0

            # Update rates for supported currencies
            for currency in SUPPORTED_CURRENCIES:
                if currency not in rates:
                    logger.warning(f"Currency {currency} not in API response, skipping")
                    continue

                rate_value = float(rates[currency])

                # Upsert rate (update if exists, insert if not)
                rate = db.query(ExchangeRate).filter(ExchangeRate.currency == currency).first()
                if rate:
                    rate.rate_to_jpy = rate_value
                    rate.updated_at = datetime.utcnow()
                else:
                    rate = ExchangeRate(
                        currency=currency,
                        rate_to_jpy=rate_value,
                        updated_at=datetime.utcnow(),
                    )
                    db.add(rate)

                updated_count += 1

            db.commit()

            logger.info(f"Successfully updated {updated_count} exchange rates from API")
            return {
                "success": True,
                "updated_count": updated_count,
                "timestamp": datetime.utcnow(),
                "source": "api",
            }

        except (requests.RequestException, ValueError) as e:
            logger.warning(f"Failed to fetch exchange rates: {e}. Using cached rates.")

            # Return cached rates metadata
            cached_rates = db.query(ExchangeRate).all()
            return {
                "success": False,
                "updated_count": 0,
                "timestamp": (
                    min(r.updated_at for r in cached_rates) if cached_rates else None
                ),
                "source": "cache",
            }

    @staticmethod
    def get_cached_rates(db: Session) -> dict[str, float]:
        """Get cached exchange rates from database.

        Args:
            db: Database session

        Returns:
            Dictionary of currency codes to rates (e.g., {"JPY": 1.0, "USD": 0.00667})
        """
        rates = db.query(ExchangeRate).all()
        return {rate.currency: float(rate.rate_to_jpy) for rate in rates}

    @staticmethod
    def get_rate(db: Session, currency: str) -> float | None:
        """Get exchange rate for a specific currency.

        Args:
            db: Database session
            currency: Currency code (e.g., "USD", "VND")

        Returns:
            Rate to JPY, or None if currency not found
        """
        rate = db.query(ExchangeRate).filter(ExchangeRate.currency == currency).first()
        return float(rate.rate_to_jpy) if rate else None

    @staticmethod
    def get_rates_with_metadata(db: Session) -> dict[str, Any]:
        """Get rates with metadata (updated_at timestamps).

        Args:
            db: Database session

        Returns:
            {
                "rates": {"JPY": 1.0, "USD": 0.00667, "VND": 160.0},
                "updated_at": "2025-11-19T04:00:00Z",
                "base_currency": "JPY"
            }
        """
        rates = db.query(ExchangeRate).all()

        if not rates:
            return {"rates": {}, "updated_at": None, "base_currency": "JPY"}

        return {
            "rates": {r.currency: float(r.rate_to_jpy) for r in rates},
            "updated_at": max(r.updated_at for r in rates).isoformat(),
            "base_currency": "JPY",
        }
