"""Impermanent Loss Calculator Service.

Provides IL estimation for LP positions based on price changes.
Uses simplified formula for 50/50 pools: IL = 2*sqrt(r)/(1+r) - 1
Where r = price_ratio (new_price / old_price)
"""
import logging
import math
from decimal import Decimal
from typing import Optional

from ..schemas.crypto_wallet import DefiPositionSnapshotResponse

logger = logging.getLogger(__name__)


class ILCalculatorService:
    """Service for calculating impermanent loss on LP positions."""

    @staticmethod
    def calculate_il_percentage(price_ratio: float) -> float:
        """Calculate impermanent loss for a 50/50 pool.

        Formula: IL = 2*sqrt(r)/(1+r) - 1
        Where r = new_price / old_price

        Args:
            price_ratio: Ratio of new price to old price (e.g., 2.0 for 2x increase)

        Returns:
            IL as a negative percentage (e.g., -0.057 for 5.7% loss)
        """
        if price_ratio <= 0:
            return 0.0

        sqrt_r = math.sqrt(price_ratio)
        il = (2 * sqrt_r / (1 + price_ratio)) - 1
        return il

    @staticmethod
    def calculate_il_from_snapshots(
        start_snapshot: DefiPositionSnapshotResponse,
        end_snapshot: DefiPositionSnapshotResponse,
    ) -> Optional[dict]:
        """Calculate IL metrics between two snapshots.

        Args:
            start_snapshot: Earlier snapshot (deposit time proxy)
            end_snapshot: Current/later snapshot

        Returns:
            Dict with IL metrics or None if calculation not possible
        """
        # Need price data to calculate IL
        if not start_snapshot.price_usd or not end_snapshot.price_usd:
            return None

        if start_snapshot.price_usd <= 0:
            return None

        # Calculate price ratio
        price_ratio = float(end_snapshot.price_usd / start_snapshot.price_usd)

        # Calculate IL percentage
        il_pct = ILCalculatorService.calculate_il_percentage(price_ratio)

        # Calculate HODL value (if you just held the tokens)
        # Assuming initial deposit value = start_snapshot.balance_usd
        hodl_value = float(start_snapshot.balance_usd) * price_ratio

        # Actual LP value
        lp_value = float(end_snapshot.balance_usd)

        # IL in USD terms
        il_usd = lp_value - hodl_value

        # Performance comparison
        lp_return_pct = (lp_value / float(start_snapshot.balance_usd) - 1) * 100 if start_snapshot.balance_usd > 0 else 0
        hodl_return_pct = (price_ratio - 1) * 100

        return {
            "il_percentage": round(il_pct * 100, 2),  # As percentage (e.g., -5.7)
            "il_usd": round(il_usd, 2),
            "price_ratio": round(price_ratio, 4),
            "lp_value_usd": round(lp_value, 2),
            "hodl_value_usd": round(hodl_value, 2),
            "lp_return_pct": round(lp_return_pct, 2),
            "hodl_return_pct": round(hodl_return_pct, 2),
            "lp_outperformed": lp_value > hodl_value,
        }

    @staticmethod
    def calculate_position_performance(
        snapshots: list[DefiPositionSnapshotResponse],
        include_apy_earnings: bool = True,
    ) -> Optional[dict]:
        """Calculate comprehensive performance metrics for a position.

        Args:
            snapshots: List of snapshots ordered by date (newest first)
            include_apy_earnings: Whether to estimate APY earnings

        Returns:
            Dict with performance metrics
        """
        if len(snapshots) < 2:
            return None

        # Get first and last snapshots
        latest = snapshots[0]
        earliest = snapshots[-1]

        # Calculate holding period
        days_held = (latest.snapshot_date - earliest.snapshot_date).days
        if days_held <= 0:
            return None

        # Calculate basic performance
        start_value = float(earliest.balance_usd)
        end_value = float(latest.balance_usd)

        if start_value <= 0:
            return None

        total_return_usd = end_value - start_value
        total_return_pct = (total_return_usd / start_value) * 100

        # Annualized return - cap to reasonable bounds to avoid astronomical values
        # When days_held is very small, compounding produces unrealistic numbers
        if days_held >= 7:  # Only annualize if we have at least 7 days of data
            annualized_return = ((end_value / start_value) ** (365 / days_held) - 1) * 100
            # Cap to ±9999% to avoid display issues
            annualized_return = max(-9999, min(9999, annualized_return))
        else:
            # For short periods, return None to indicate insufficient data
            annualized_return = None

        # Calculate IL if price data available
        il_metrics = ILCalculatorService.calculate_il_from_snapshots(earliest, latest)

        # Estimate yield earned (total return + IL recovery)
        estimated_yield_usd = None
        estimated_yield_pct = None
        if il_metrics:
            # Yield = Total Return - Price Movement Effect
            # If IL is -5% but total return is +10%, yield ≈ 15%
            price_effect = (il_metrics["price_ratio"] - 1) * start_value
            estimated_yield_usd = total_return_usd - price_effect + abs(il_metrics["il_usd"])
            estimated_yield_pct = (estimated_yield_usd / start_value) * 100 if start_value > 0 else 0

        # Get latest APY if available
        current_apy = float(latest.protocol_apy) if latest.protocol_apy else None

        result = {
            "position_id": latest.position_id,
            "protocol": latest.protocol,
            "symbol": latest.symbol,
            "days_held": days_held,
            "start_value_usd": round(start_value, 2),
            "current_value_usd": round(end_value, 2),
            "total_return_usd": round(total_return_usd, 2),
            "total_return_pct": round(total_return_pct, 2),
            "annualized_return_pct": round(annualized_return, 2) if annualized_return is not None else None,
            "current_apy": round(current_apy, 2) if current_apy else None,
            "snapshot_count": len(snapshots),
        }

        # Add IL metrics if available
        if il_metrics:
            result.update({
                "il_percentage": il_metrics["il_percentage"],
                "il_usd": il_metrics["il_usd"],
                "hodl_value_usd": il_metrics["hodl_value_usd"],
                "lp_vs_hodl_usd": round(end_value - il_metrics["hodl_value_usd"], 2),
                "lp_outperformed_hodl": il_metrics["lp_outperformed"],
            })

        # Add yield estimate if available
        if estimated_yield_usd is not None:
            result.update({
                "estimated_yield_usd": round(estimated_yield_usd, 2),
                "estimated_yield_pct": round(estimated_yield_pct, 2),
            })

        return result

    @staticmethod
    def get_il_scenarios(current_price_ratio: float = 1.0) -> list[dict]:
        """Generate IL scenarios for educational purposes.

        Args:
            current_price_ratio: Current price ratio (default 1.0 = no change)

        Returns:
            List of scenario dicts showing IL at various price changes
        """
        scenarios = []
        price_changes = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0]

        for ratio in price_changes:
            il = ILCalculatorService.calculate_il_percentage(ratio)
            scenarios.append({
                "price_change": f"{(ratio - 1) * 100:+.0f}%",
                "price_ratio": ratio,
                "il_percentage": round(il * 100, 2),
                "vs_hodl": "LP loses" if il < 0 else "LP wins",
            })

        return scenarios
