"""Reward scanning and management service."""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from ..models.crypto_wallet import PositionReward, PositionCostBasis
from .polygonscan_service import PolygonscanService

logger = logging.getLogger(__name__)


class RewardService:
    """Service for managing position rewards."""

    @staticmethod
    async def scan_historical_claims(
        db: Session,
        user_id: int,
        wallet_address: str,
        days: int = 90
    ) -> dict:
        """Scan for historical Merkl claims.

        Returns:
            dict with scanned, new, matched, unmatched counts
        """
        stats = {"scanned": 0, "new": 0, "matched": 0, "unmatched": 0}

        # Calculate start block from days ago
        start_timestamp = int((datetime.utcnow() - timedelta(days=days)).timestamp())
        from_block = await PolygonscanService.get_block_by_timestamp(start_timestamp)

        # Fetch claim events
        claims = await PolygonscanService.get_merkl_claims(
            wallet_address, from_block=from_block
        )
        stats["scanned"] = len(claims)

        # Get all existing tx_hashes for this user to avoid duplicates
        existing_hashes = set(
            row[0] for row in db.query(PositionReward.tx_hash).filter(
                PositionReward.user_id == user_id
            ).all()
        )

        # Track tx_hashes we're adding in this batch to avoid duplicates within the batch
        batch_hashes = set()

        for claim in claims:
            tx_hash = claim["tx_hash"]

            # Skip if already in database or already in this batch
            if tx_hash in existing_hashes or tx_hash in batch_hashes:
                continue

            # Use token info from tokentx response, fallback to lookup
            token_symbol = claim.get("token_symbol")
            decimals = claim.get("token_decimals", 18)
            if not token_symbol:
                token_info = await PolygonscanService.get_token_info(claim["token_address"])
                token_symbol = token_info.get("symbol")
                decimals = token_info.get("decimals", 18)

            # Calculate human-readable amount
            amount = Decimal(claim["amount_raw"]) / (Decimal(10) ** decimals)

            # Create reward record
            reward = PositionReward(
                user_id=user_id,
                wallet_address=wallet_address.lower(),
                chain_id="polygon",
                reward_token_address=claim["token_address"],
                reward_token_symbol=token_symbol,
                reward_amount=amount,
                claimed_at=claim["timestamp"],
                tx_hash=tx_hash,
                block_number=claim["block_number"],
                source="merkl",
                is_attributed=False,
            )
            db.add(reward)
            batch_hashes.add(tx_hash)
            stats["new"] += 1

        db.commit()

        # Run matching on new rewards if any
        if stats["new"] > 0:
            # Import here to avoid circular imports
            from .reward_matching_service import RewardMatchingService
            match_result = await RewardMatchingService.match_rewards_to_positions(
                db, user_id, wallet_address
            )
            stats["matched"] = match_result["matched"]
            stats["unmatched"] = match_result["unmatched"]

        return stats

    @staticmethod
    def get_all_rewards(db: Session, user_id: int) -> list[PositionReward]:
        """Get all rewards for a user."""
        return db.query(PositionReward).filter(
            PositionReward.user_id == user_id
        ).order_by(PositionReward.claimed_at.desc()).all()

    @staticmethod
    def get_unattributed_rewards(db: Session, user_id: int) -> list[PositionReward]:
        """Get unattributed rewards."""
        return db.query(PositionReward).filter(
            PositionReward.user_id == user_id,
            PositionReward.is_attributed == False  # noqa: E712
        ).order_by(PositionReward.claimed_at.desc()).all()

    @staticmethod
    def get_reward_by_id(db: Session, user_id: int, reward_id: int) -> Optional[PositionReward]:
        """Get a specific reward."""
        return db.query(PositionReward).filter(
            PositionReward.id == reward_id,
            PositionReward.user_id == user_id
        ).first()

    @staticmethod
    def get_position_rewards(db: Session, user_id: int, position_id: str) -> list[PositionReward]:
        """Get all rewards for a specific position."""
        return db.query(PositionReward).filter(
            PositionReward.user_id == user_id,
            PositionReward.position_id == position_id,
            PositionReward.is_attributed == True  # noqa: E712
        ).order_by(PositionReward.claimed_at.desc()).all()

    @staticmethod
    async def calculate_position_roi(
        db: Session,
        user_id: int,
        position_id: str,
        current_value_usd: Decimal
    ) -> Optional[dict]:
        """Calculate ROI including rewards for a position.

        ROI = (current_value + total_rewards - cost_basis) / cost_basis * 100

        Returns:
            dict with ROI metrics or None if no cost basis
        """
        # Get cost basis
        cost_basis = db.query(PositionCostBasis).filter(
            PositionCostBasis.user_id == user_id,
            PositionCostBasis.position_id == position_id
        ).first()

        # Get rewards
        rewards = RewardService.get_position_rewards(db, user_id, position_id)
        total_rewards_usd = sum(
            r.reward_usd or Decimal(0) for r in rewards
        )

        # Calculate token totals grouped by symbol
        token_totals: dict[str, Decimal] = {}
        for r in rewards:
            symbol = r.reward_token_symbol or "UNKNOWN"
            token_totals[symbol] = token_totals.get(symbol, Decimal(0)) + (r.reward_amount or Decimal(0))

        rewards_by_token = [
            {"symbol": symbol, "amount": amount}
            for symbol, amount in sorted(token_totals.items())
        ]

        # Calculate monthly breakdown (grouped by month + symbol)
        monthly_totals: dict[tuple[str, str], dict] = {}
        for r in rewards:
            month_key = r.claimed_at.strftime("%Y-%m") if r.claimed_at else "unknown"
            symbol = r.reward_token_symbol or "UNKNOWN"
            key = (month_key, symbol)
            if key not in monthly_totals:
                monthly_totals[key] = {"month": month_key, "symbol": symbol, "amount": Decimal(0), "count": 0}
            monthly_totals[key]["amount"] += r.reward_amount or Decimal(0)
            monthly_totals[key]["count"] += 1

        # Sort by month descending (newest first)
        rewards_by_month = sorted(
            monthly_totals.values(),
            key=lambda x: x["month"],
            reverse=True
        )

        result = {
            "position_id": position_id,
            "current_value_usd": current_value_usd,
            "cost_basis_usd": None,
            "total_rewards_usd": total_rewards_usd,
            "rewards_count": len(rewards),
            "rewards_by_token": rewards_by_token,
            "rewards_by_month": rewards_by_month,
            "simple_roi_pct": None,
            "annualized_roi_pct": None,
            "days_held": None,
        }

        if cost_basis:
            result["cost_basis_usd"] = cost_basis.total_usd
            cost = float(cost_basis.total_usd)

            if cost > 0:
                # Simple ROI
                total_return = float(current_value_usd) + float(total_rewards_usd) - cost
                simple_roi = (total_return / cost) * 100
                result["simple_roi_pct"] = round(simple_roi, 2)

                # Days held
                days_held = (datetime.utcnow() - cost_basis.deposited_at).days
                result["days_held"] = max(days_held, 1)

                # Annualized ROI
                if days_held > 0:
                    annualized = ((1 + simple_roi / 100) ** (365 / days_held) - 1) * 100
                    result["annualized_roi_pct"] = round(annualized, 2)

        return result
