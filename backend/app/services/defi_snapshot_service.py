"""DeFi position snapshot service for historical tracking."""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import and_, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from ..models.crypto_wallet import CryptoWallet, DefiPositionSnapshot
from ..schemas.crypto_wallet import (
    DefiPositionSnapshotResponse,
    PositionHistoryResponse,
    WalletPerformanceResponse,
)
from .zerion_api_service import ZerionApiService
from .defillama_service import DeFiLlamaService

logger = logging.getLogger(__name__)


class DefiSnapshotService:
    """Service for DeFi position snapshots and historical tracking."""

    @staticmethod
    async def capture_all_snapshots(db: Session) -> dict:
        """Capture snapshots for all users with active crypto wallets.

        Returns:
            dict with counts: {users, wallets, positions, errors}
        """
        stats = {"users": 0, "wallets": 0, "positions": 0, "errors": 0}
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Get all active wallets
        wallets = db.query(CryptoWallet).filter(
            CryptoWallet.is_active == True  # noqa: E712
        ).all()

        user_ids = set()
        for wallet in wallets:
            user_ids.add(wallet.user_id)
            stats["wallets"] += 1

            try:
                positions = await ZerionApiService.get_defi_positions(
                    wallet.wallet_address,
                    wallet.chains
                )

                # Deduplicate positions by ID - aggregate balances for same position
                position_map: dict = {}
                for pos in positions:
                    pos_id = pos.get("id", "")
                    if pos_id in position_map:
                        # Aggregate balances for duplicate position IDs
                        position_map[pos_id]["balance"] = float(position_map[pos_id].get("balance", 0)) + float(pos.get("balance", 0))
                        position_map[pos_id]["balance_usd"] = float(position_map[pos_id].get("balance_usd", 0)) + float(pos.get("balance_usd", 0))
                    else:
                        position_map[pos_id] = pos.copy()

                for pos in position_map.values():
                    # Try to get APY from DeFiLlama
                    protocol_apy = None
                    try:
                        apy_data = await DeFiLlamaService.match_position_to_pool(
                            pos.get("protocol", ""),
                            pos.get("symbol", ""),
                            pos.get("chain_id", "")
                        )
                        if apy_data and apy_data.get("apy") is not None:
                            protocol_apy = Decimal(str(apy_data["apy"]))
                    except Exception as e:
                        logger.debug(f"APY lookup failed for {pos.get('symbol')}: {e}")

                    snapshot_data = {
                        "user_id": wallet.user_id,
                        "wallet_address": wallet.wallet_address,
                        "position_id": pos.get("id", ""),
                        "protocol": pos.get("protocol", "Unknown"),
                        "chain_id": pos.get("chain_id", ""),
                        "position_type": pos.get("position_type", "deposit"),
                        "symbol": pos.get("symbol", ""),
                        "token_name": pos.get("token_name"),
                        "balance": Decimal(str(pos.get("balance", 0))),
                        "balance_usd": Decimal(str(pos.get("balance_usd", 0))),
                        "price_usd": Decimal(str(pos.get("price_usd", 0))) if pos.get("price_usd") else None,
                        "protocol_apy": protocol_apy,
                        "snapshot_date": today,
                    }

                    # Check if snapshot already exists for today
                    existing = db.query(DefiPositionSnapshot).filter(
                        and_(
                            DefiPositionSnapshot.user_id == wallet.user_id,
                            DefiPositionSnapshot.position_id == pos.get("id", ""),
                            DefiPositionSnapshot.snapshot_date == today
                        )
                    ).first()

                    if not existing:
                        snapshot = DefiPositionSnapshot(**snapshot_data)
                        db.add(snapshot)
                        stats["positions"] += 1

                db.commit()

            except Exception as e:
                logger.error(f"Snapshot failed for wallet {wallet.wallet_address}: {e}")
                stats["errors"] += 1
                db.rollback()

        stats["users"] = len(user_ids)
        logger.info(f"Snapshot capture complete: {stats}")
        return stats

    @staticmethod
    async def backfill_snapshots(
        db: Session,
        user_id: int,
        wallet_id: int
    ) -> dict:
        """Manually backfill snapshot for a wallet (captures current state).

        Returns:
            dict with stats: {positions, skipped} or {error: str}
        """
        from .crypto_wallet_service import CryptoWalletService

        wallet = CryptoWalletService.get_wallet(db, user_id, wallet_id)
        if not wallet:
            return {"error": "Wallet not found"}

        stats = {"positions": 0, "skipped": 0}
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        try:
            positions = await ZerionApiService.get_defi_positions(
                wallet.wallet_address,
                wallet.chains
            )

            for pos in positions:
                # Check if snapshot already exists
                existing = db.query(DefiPositionSnapshot).filter(
                    and_(
                        DefiPositionSnapshot.user_id == user_id,
                        DefiPositionSnapshot.position_id == pos.get("id", ""),
                        DefiPositionSnapshot.snapshot_date == today
                    )
                ).first()

                if existing:
                    stats["skipped"] += 1
                    continue

                # Try to get APY from DeFiLlama
                protocol_apy = None
                try:
                    apy_data = await DeFiLlamaService.match_position_to_pool(
                        pos.get("protocol", ""),
                        pos.get("symbol", ""),
                        pos.get("chain_id", "")
                    )
                    if apy_data and apy_data.get("apy") is not None:
                        protocol_apy = Decimal(str(apy_data["apy"]))
                except Exception as e:
                    logger.debug(f"APY lookup failed for {pos.get('symbol')}: {e}")

                snapshot = DefiPositionSnapshot(
                    user_id=user_id,
                    wallet_address=wallet.wallet_address,
                    position_id=pos.get("id", ""),
                    protocol=pos.get("protocol", "Unknown"),
                    chain_id=pos.get("chain_id", ""),
                    position_type=pos.get("position_type", "deposit"),
                    symbol=pos.get("symbol", ""),
                    token_name=pos.get("token_name"),
                    balance=Decimal(str(pos.get("balance", 0))),
                    balance_usd=Decimal(str(pos.get("balance_usd", 0))),
                    price_usd=Decimal(str(pos.get("price_usd", 0))) if pos.get("price_usd") else None,
                    protocol_apy=protocol_apy,
                    snapshot_date=today,
                )
                db.add(snapshot)
                stats["positions"] += 1

            db.commit()

        except Exception as e:
            logger.error(f"Backfill failed for wallet {wallet.wallet_address}: {e}")
            db.rollback()
            return {"error": str(e)}

        return stats

    @staticmethod
    def get_position_history(
        db: Session,
        user_id: int,
        position_id: str,
        days: int = 30
    ) -> Optional[PositionHistoryResponse]:
        """Get historical snapshots for a specific position."""
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        snapshots = db.query(DefiPositionSnapshot).filter(
            and_(
                DefiPositionSnapshot.user_id == user_id,
                DefiPositionSnapshot.position_id == position_id,
                DefiPositionSnapshot.snapshot_date >= cutoff_date
            )
        ).order_by(DefiPositionSnapshot.snapshot_date.desc()).all()

        if not snapshots:
            return None

        latest = snapshots[0]

        # Calculate changes
        change_7d: Optional[Decimal] = None
        change_30d: Optional[Decimal] = None
        pct_7d: Optional[float] = None
        pct_30d: Optional[float] = None

        for snap in snapshots:
            days_ago = (datetime.utcnow() - snap.snapshot_date).days
            if days_ago >= 7 and change_7d is None:
                change_7d = latest.balance_usd - snap.balance_usd
                if snap.balance_usd > 0:
                    pct_7d = float(change_7d / snap.balance_usd * 100)
            if days_ago >= 30 and change_30d is None:
                change_30d = latest.balance_usd - snap.balance_usd
                if snap.balance_usd > 0:
                    pct_30d = float(change_30d / snap.balance_usd * 100)

        return PositionHistoryResponse(
            position_id=position_id,
            protocol=latest.protocol,
            symbol=latest.symbol,
            current_value_usd=latest.balance_usd,
            snapshots=[DefiPositionSnapshotResponse.model_validate(s) for s in snapshots],
            change_7d_usd=change_7d,
            change_7d_pct=pct_7d,
            change_30d_usd=change_30d,
            change_30d_pct=pct_30d,
        )

    @staticmethod
    def get_wallet_performance(
        db: Session,
        user_id: int,
        wallet_id: int
    ) -> Optional[WalletPerformanceResponse]:
        """Get aggregated performance for a wallet."""
        from .crypto_wallet_service import CryptoWalletService

        wallet = CryptoWalletService.get_wallet(db, user_id, wallet_id)
        if not wallet:
            return None

        # Get distinct position IDs for this wallet
        position_ids = db.query(DefiPositionSnapshot.position_id).filter(
            and_(
                DefiPositionSnapshot.user_id == user_id,
                DefiPositionSnapshot.wallet_address == wallet.wallet_address
            )
        ).distinct().all()

        positions = []
        total_value = Decimal("0")
        total_change_7d = Decimal("0")
        total_change_30d = Decimal("0")

        for (pos_id,) in position_ids:
            history = DefiSnapshotService.get_position_history(db, user_id, pos_id, 30)
            if history:
                positions.append(history)
                total_value += history.current_value_usd
                if history.change_7d_usd:
                    total_change_7d += history.change_7d_usd
                if history.change_30d_usd:
                    total_change_30d += history.change_30d_usd

        # Get snapshot stats
        snapshot_stats = db.query(
            func.count(DefiPositionSnapshot.id),
            func.min(DefiPositionSnapshot.snapshot_date)
        ).filter(
            and_(
                DefiPositionSnapshot.user_id == user_id,
                DefiPositionSnapshot.wallet_address == wallet.wallet_address
            )
        ).first()

        return WalletPerformanceResponse(
            wallet_address=wallet.wallet_address,
            total_value_usd=total_value,
            total_change_7d_usd=total_change_7d if total_change_7d != 0 else None,
            total_change_30d_usd=total_change_30d if total_change_30d != 0 else None,
            positions=positions,
            snapshot_count=snapshot_stats[0] or 0,
            first_snapshot_date=snapshot_stats[1],
        )

    @staticmethod
    def cleanup_old_snapshots(db: Session, retention_days: int = 365) -> int:
        """Delete snapshots older than retention period.

        Returns:
            Number of deleted rows
        """
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        deleted = db.query(DefiPositionSnapshot).filter(
            DefiPositionSnapshot.snapshot_date < cutoff_date
        ).delete(synchronize_session=False)

        db.commit()
        logger.info(f"Cleaned up {deleted} old snapshots (older than {retention_days} days)")
        return deleted
