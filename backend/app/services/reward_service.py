"""Reward scanning and management service."""
import hashlib
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from ..models.crypto_wallet import PositionReward, PositionCostBasis
from ..models.transaction import Transaction
from .polygonscan_service import PolygonscanService

logger = logging.getLogger(__name__)

# CoinGecko token ID mapping for common reward tokens
TOKEN_COINGECKO_IDS = {
    "QUICK": "quickswap",
    "OSHI": "oshi-token",
    "WMATIC": "wmatic",
    "MATIC": "matic-network",
    "USDC": "usd-coin",
    "USDT": "tether",
    "WETH": "weth",
    "ETH": "ethereum",
    "MANTA": "manta-network",
}


async def get_token_prices(symbols: list[str]) -> dict[str, Decimal]:
    """Fetch current USD prices for tokens from CoinGecko."""
    prices = {}

    # Map symbols to CoinGecko IDs
    ids_to_fetch = []
    symbol_to_id = {}
    for symbol in symbols:
        cg_id = TOKEN_COINGECKO_IDS.get(symbol.upper())
        if cg_id:
            ids_to_fetch.append(cg_id)
            symbol_to_id[cg_id] = symbol

    if not ids_to_fetch:
        return prices

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": ",".join(ids_to_fetch),
                    "vs_currencies": "usd"
                },
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                for cg_id, price_data in data.items():
                    symbol = symbol_to_id.get(cg_id)
                    if symbol and "usd" in price_data:
                        prices[symbol] = Decimal(str(price_data["usd"]))
    except Exception as e:
        logger.warning(f"Failed to fetch token prices: {e}")

    return prices


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
    async def scan_symbiotic_claims(
        db: Session,
        user_id: int,
        wallet_address: str,
        days: int = 90
    ) -> dict:
        """Scan for historical Symbiotic staking claims on Ethereum.

        Returns:
            dict with scanned, new counts
        """
        stats = {"scanned": 0, "new": 0}

        # Calculate start block from days ago
        start_timestamp = int((datetime.utcnow() - timedelta(days=days)).timestamp())
        from_block = await PolygonscanService.get_block_by_timestamp_eth(start_timestamp)

        # Fetch claim events from Ethereum
        claims = await PolygonscanService.get_symbiotic_claims(
            wallet_address, from_block=from_block
        )
        stats["scanned"] = len(claims)

        # Get all existing tx_hashes for this user to avoid duplicates
        existing_hashes = set(
            row[0] for row in db.query(PositionReward.tx_hash).filter(
                PositionReward.user_id == user_id
            ).all()
        )

        # Track tx_hashes we're adding in this batch
        batch_hashes = set()

        for claim in claims:
            tx_hash = claim["tx_hash"]

            # Skip if already in database or already in this batch
            if tx_hash in existing_hashes or tx_hash in batch_hashes:
                continue

            # Use token info from tokentx response
            token_symbol = claim.get("token_symbol")
            decimals = claim.get("token_decimals", 18)
            if not token_symbol:
                token_info = await PolygonscanService.get_token_info(claim["token_address"])
                token_symbol = token_info.get("symbol")
                decimals = token_info.get("decimals", 18)

            # Calculate human-readable amount
            amount = Decimal(claim["amount_raw"]) / (Decimal(10) ** decimals)

            # Create reward record - auto-attribute to wallet (staking rewards)
            reward = PositionReward(
                user_id=user_id,
                wallet_address=wallet_address.lower(),
                chain_id="eth",
                reward_token_address=claim["token_address"],
                reward_token_symbol=token_symbol,
                reward_amount=amount,
                claimed_at=claim["timestamp"],
                tx_hash=tx_hash,
                block_number=claim["block_number"],
                source="symbiotic",
                is_attributed=True,  # Auto-attribute staking rewards
            )
            db.add(reward)
            batch_hashes.add(tx_hash)
            stats["new"] += 1

        db.commit()
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
    def get_staking_rewards(db: Session, user_id: int, source: str = "symbiotic") -> list[PositionReward]:
        """Get all staking rewards by source (e.g., symbiotic)."""
        return db.query(PositionReward).filter(
            PositionReward.user_id == user_id,
            PositionReward.source == source
        ).order_by(PositionReward.claimed_at.desc()).all()

    @staticmethod
    async def calculate_staking_roi(
        db: Session,
        user_id: int,
        source: str = "symbiotic"
    ) -> dict:
        """Calculate staking rewards summary (grouped by month).

        Returns:
            dict with rewards summary by token and month
        """
        rewards = RewardService.get_staking_rewards(db, user_id, source)

        # Calculate token totals grouped by symbol
        token_totals: dict[str, Decimal] = {}
        for r in rewards:
            symbol = r.reward_token_symbol or "UNKNOWN"
            token_totals[symbol] = token_totals.get(symbol, Decimal(0)) + (r.reward_amount or Decimal(0))

        # Fetch current token prices
        token_prices = await get_token_prices(list(token_totals.keys()))

        # Build rewards_by_token with USD values
        rewards_by_token = []
        total_rewards_usd = Decimal(0)
        for symbol, amount in sorted(token_totals.items()):
            price = token_prices.get(symbol)
            amount_usd = (amount * price) if price else None
            if amount_usd:
                total_rewards_usd += amount_usd
            rewards_by_token.append({
                "symbol": symbol,
                "amount": amount,
                "amount_usd": amount_usd
            })

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

        # Add USD values to monthly breakdown
        rewards_by_month = []
        for data in sorted(monthly_totals.values(), key=lambda x: x["month"], reverse=True):
            price = token_prices.get(data["symbol"])
            amount_usd = (data["amount"] * price) if price else None
            rewards_by_month.append({
                "month": data["month"],
                "symbol": data["symbol"],
                "amount": data["amount"],
                "amount_usd": amount_usd,
                "count": data["count"]
            })

        return {
            "source": source,
            "total_rewards_usd": total_rewards_usd,
            "rewards_count": len(rewards),
            "rewards_by_token": rewards_by_token,
            "rewards_by_month": rewards_by_month,
        }

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

        # Calculate token totals grouped by symbol
        token_totals: dict[str, Decimal] = {}
        for r in rewards:
            symbol = r.reward_token_symbol or "UNKNOWN"
            token_totals[symbol] = token_totals.get(symbol, Decimal(0)) + (r.reward_amount or Decimal(0))

        # Fetch current token prices
        token_prices = await get_token_prices(list(token_totals.keys()))

        # Build rewards_by_token with USD values, filter out < $1
        rewards_by_token = []
        total_rewards_usd = Decimal(0)
        for symbol, amount in sorted(token_totals.items()):
            price = token_prices.get(symbol)
            amount_usd = (amount * price) if price else None
            if amount_usd:
                total_rewards_usd += amount_usd
            # Filter out tokens with < $1 USD value
            if amount_usd is None or amount_usd >= Decimal(1):
                rewards_by_token.append({
                    "symbol": symbol,
                    "amount": amount,
                    "amount_usd": amount_usd
                })

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

        # Add USD values to monthly breakdown, filter out < $1
        rewards_by_month = []
        for data in sorted(monthly_totals.values(), key=lambda x: x["month"], reverse=True):
            price = token_prices.get(data["symbol"])
            amount_usd = (data["amount"] * price) if price else None
            # Filter out monthly entries with < $1 USD value
            if amount_usd is None or amount_usd >= Decimal(1):
                rewards_by_month.append({
                    "month": data["month"],
                    "symbol": data["symbol"],
                    "amount": data["amount"],
                    "amount_usd": amount_usd,
                    "count": data["count"]
                })

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

    @staticmethod
    def create_transaction_from_reward(
        db: Session,
        user_id: int,
        reward_id: int
    ) -> dict:
        """Create income transaction from position reward.

        Args:
            db: Database session
            user_id: User ID
            reward_id: PositionReward ID

        Returns:
            dict with transaction_id, amount_usd, message

        Raises:
            ValueError: If reward not found, already linked, or missing USD value
        """
        from .account_service import AccountService
        from .category_service import CategoryService

        # Fetch reward
        reward = db.query(PositionReward).filter(
            PositionReward.id == reward_id,
            PositionReward.user_id == user_id
        ).first()

        if not reward:
            raise ValueError(f"Reward {reward_id} not found")

        # Check if already linked
        if reward.transaction_id is not None:
            raise ValueError(f"Reward {reward_id} already linked to transaction {reward.transaction_id}")

        # Validate USD value exists
        if reward.reward_usd is None or reward.reward_usd <= 0:
            raise ValueError(f"Reward {reward_id} has no USD value")

        # Get or create account and category
        account = AccountService.get_or_create_crypto_income_account(db, user_id)
        category = CategoryService.get_or_create_crypto_rewards_category(db, user_id)

        # Format transaction notes
        price_per_token = (
            float(reward.reward_usd) / float(reward.reward_amount)
            if reward.reward_amount > 0
            else 0
        )

        notes = (
            f"{float(reward.reward_amount):.4f} {reward.reward_token_symbol or 'TOKEN'} "
            f"@ ${price_per_token:.6f} | "
            f"tx: {reward.tx_hash[:10]}...{reward.tx_hash[-6:]}"
        )

        # Create transaction - amount in cents (USD * 100)
        tx_date = reward.claimed_at.date() if reward.claimed_at else datetime.utcnow().date()
        month_key = tx_date.strftime("%Y-%m")

        # Generate unique tx_hash from reward data
        hash_input = f"reward|{reward_id}|{reward.tx_hash}|{user_id}|{datetime.utcnow().timestamp()}"
        tx_hash = hashlib.sha256(hash_input.encode()).hexdigest()

        transaction = Transaction(
            user_id=user_id,
            account_id=account.id,
            date=tx_date,
            description=f"LP Reward: {reward.reward_token_symbol or 'Token'}",
            amount=int(float(reward.reward_usd) * 100),  # Convert to cents
            currency="USD",
            category=category.name,
            subcategory=None,
            source=reward.source,  # 'merkl', 'symbiotic', etc.
            payment_method=None,
            notes=notes,
            is_income=True,
            is_transfer=False,
            is_adjustment=False,
            month_key=month_key,
            tx_hash=tx_hash,
            # Crypto fields
            token_symbol=reward.reward_token_symbol,
            token_amount=reward.reward_amount,
            chain_id=reward.chain_id
        )

        db.add(transaction)
        db.flush()  # Get transaction.id before commit

        # Link reward to transaction
        reward.transaction_id = transaction.id

        db.commit()
        db.refresh(transaction)

        return {
            "transaction_id": transaction.id,
            "amount_usd": float(reward.reward_usd),
            "message": "Transaction created successfully"
        }
