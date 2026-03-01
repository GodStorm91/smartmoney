"""Analytics service: daily spending aggregation for heatmap visualization."""
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


class HeatmapAnalyticsService:
    """Daily spending data for the day-of-week spending heatmap."""

    @staticmethod
    def get_daily_spending(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        """Get daily spending data for heatmap visualization.

        Defaults to the last 3 full months when no dates are given.

        Returns:
            {
                "daily_data": [{"date": "2026-03-01", "amount": 5400, "day_of_week": 5}, ...],
                "day_of_week_avg": {"0": 3200, "1": 4100, ..., "6": 1800},
            }
        """
        today = date.today()
        if not start_date:
            # Step back 3 month-starts from current month
            m = today.replace(day=1)
            m = (m - timedelta(days=1)).replace(day=1)
            m = (m - timedelta(days=1)).replace(day=1)
            start_date = (m - timedelta(days=1)).replace(day=1)
        if not end_date:
            end_date = today

        rates = ExchangeRateService.get_cached_rates(db)

        results = (
            db.query(Transaction.date, Transaction.amount, Transaction.currency)
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                ~Transaction.is_income,
                Transaction.date >= start_date,
                Transaction.date <= end_date,
            )
            .order_by(Transaction.date)
            .all()
        )

        # Aggregate by calendar date
        date_totals: dict[str, float] = {}
        for row in results:
            date_key = str(row.date)
            date_totals[date_key] = date_totals.get(date_key, 0) + convert_to_jpy(
                abs(row.amount), row.currency, rates
            )

        # Build daily_data: day_of_week uses Python weekday() — 0=Monday, 6=Sunday
        daily_data = []
        for date_str in sorted(date_totals.keys()):
            d = date.fromisoformat(date_str)
            daily_data.append(
                {
                    "date": date_str,
                    "amount": round(date_totals[date_str]),
                    "day_of_week": d.weekday(),
                }
            )

        # Average spending per day-of-week
        dow_sums: dict[int, float] = {i: 0.0 for i in range(7)}
        dow_counts: dict[int, int] = {i: 0 for i in range(7)}
        for entry in daily_data:
            dow = entry["day_of_week"]
            dow_sums[dow] += entry["amount"]
            dow_counts[dow] += 1

        day_of_week_avg = {
            str(i): (round(dow_sums[i] / dow_counts[i]) if dow_counts[i] > 0 else 0)
            for i in range(7)
        }

        return {"daily_data": daily_data, "day_of_week_avg": day_of_week_avg}
