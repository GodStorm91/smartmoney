"""LP real P&L calculation service."""
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from ..models.crypto_wallet import DefiPositionSnapshot
from ..models.position_closure import PositionClosure
from ..schemas.lp_pnl import LpRealPnlPositionResponse, LpRealPnlResponse
from .lp_pnl_queries import (
    PositionKey,
    closed_positions,
    get_wallet,
    latest_snapshots,
    position_key,
    reward_totals,
)
from .position_cost_basis_service import BasisValue, PositionCostBasisService

ZERO = Decimal("0")
METHOD = "cost_basis_plus_rewards_plus_current_or_exit_value"
CAVEAT = (
    "real_pnl_usd is exact only for rows marked full. Partial rows are missing "
    "cost basis or position value and must not be quoted as true LP profit."
)


class LpPnlService:
    """Service for computing LP P&L from SmartMoney's local records."""

    @staticmethod
    def get_real_pnl(
        db: Session,
        user_id: int,
        wallet_id: Optional[int] = None,
        chain: str = "base",
        include_closed: bool = True,
        limit: int = 50,
    ) -> Optional[LpRealPnlResponse]:
        """Return known LP real P&L, marking rows partial when data is missing."""
        chain_key = chain.lower()
        wallet = get_wallet(db, user_id, wallet_id)
        if wallet_id is not None and wallet is None:
            return None

        wallet_addresses = [wallet.wallet_address] if wallet else None
        closed = closed_positions(db, user_id, chain_key, wallet_addresses) if include_closed else []
        closed_keys = {
            position_key(c.position_id, c.wallet_address, c.chain_id)
            for c in closed
        }

        snapshots = latest_snapshots(db, user_id, chain_key, wallet_addresses)
        open_snapshots = [
            snap for snap in snapshots
            if position_key(snap.position_id, snap.wallet_address, snap.chain_id) not in closed_keys
        ]

        cost_basis = PositionCostBasisService.get_effective_basis_map(
            db, user_id, chain_key, wallet_addresses
        )
        rewards = reward_totals(db, user_id, chain_key, wallet_addresses)

        positions = [
            LpPnlService._open_position(snap, cost_basis, rewards)
            for snap in open_snapshots
        ]
        positions.extend(
            LpPnlService._closed_position(closure, cost_basis, rewards)
            for closure in closed
        )
        positions = sorted(positions, key=lambda item: item.as_of, reverse=True)[:limit]

        totals = LpPnlService._totals(positions)
        return LpRealPnlResponse(
            chain=chain_key,
            wallet_id=wallet_id,
            wallet_address=wallet.wallet_address if wallet else None,
            method=METHOD,
            totals_scope="real_pnl_full_positions_only_rewards_all_positions",
            positions=positions,
            caveat=CAVEAT,
            **totals,
        )

    @staticmethod
    def _open_position(
        snapshot: DefiPositionSnapshot,
        cost_basis: dict[PositionKey, BasisValue],
        rewards: dict[PositionKey, Decimal],
    ) -> LpRealPnlPositionResponse:
        key = position_key(snapshot.position_id, snapshot.wallet_address, snapshot.chain_id)
        basis_value = cost_basis.get(key)
        basis = basis_value.amount if basis_value else None
        reward_total = rewards.get(key, ZERO)
        current_value = Decimal(str(snapshot.balance_usd))
        pnl = current_value + reward_total - basis if basis is not None else None
        return LpPnlService._position_response(
            position_id=snapshot.position_id,
            wallet_address=snapshot.wallet_address,
            chain_id=snapshot.chain_id,
            protocol=snapshot.protocol,
            symbol=snapshot.symbol,
            status="open",
            as_of=snapshot.snapshot_date,
            current_value_usd=current_value,
            exit_value_usd=None,
            cost_basis_usd=basis,
            basis_source=basis_value.source if basis_value else None,
            total_rewards_usd=reward_total,
            pnl=pnl,
            missing=[] if basis is not None else ["cost_basis_usd"],
        )

    @staticmethod
    def _closed_position(
        closure: PositionClosure,
        cost_basis: dict[PositionKey, BasisValue],
        rewards: dict[PositionKey, Decimal],
    ) -> LpRealPnlPositionResponse:
        key = position_key(closure.position_id, closure.wallet_address, closure.chain_id)
        basis_value = cost_basis.get(key)
        basis = closure.cost_basis_usd or (basis_value.amount if basis_value else None)
        basis_source = None if closure.cost_basis_usd is not None else (
            basis_value.source if basis_value else None
        )
        reward_total = closure.total_rewards_usd if closure.total_rewards_usd is not None else rewards.get(key, ZERO)
        pnl = closure.realized_pnl_usd
        if pnl is None and basis is not None:
            pnl = Decimal(str(closure.exit_value_usd)) + Decimal(str(reward_total)) - Decimal(str(basis))

        return LpPnlService._position_response(
            position_id=closure.position_id,
            wallet_address=closure.wallet_address,
            chain_id=closure.chain_id,
            protocol=closure.protocol,
            symbol=closure.symbol,
            status="closed",
            as_of=closure.exit_date,
            current_value_usd=None,
            exit_value_usd=Decimal(str(closure.exit_value_usd)),
            cost_basis_usd=Decimal(str(basis)) if basis is not None else None,
            basis_source=basis_source,
            total_rewards_usd=Decimal(str(reward_total or ZERO)),
            pnl=Decimal(str(pnl)) if pnl is not None else None,
            missing=[] if basis is not None else ["cost_basis_usd"],
        )

    @staticmethod
    def _position_response(
        *,
        position_id: str,
        wallet_address: str,
        chain_id: str,
        protocol: str,
        symbol: str,
        status: str,
        as_of,
        current_value_usd: Optional[Decimal],
        exit_value_usd: Optional[Decimal],
        cost_basis_usd: Optional[Decimal],
        basis_source: Optional[str],
        total_rewards_usd: Decimal,
        pnl: Optional[Decimal],
        missing: list[str],
    ) -> LpRealPnlPositionResponse:
        pnl_pct = float(pnl / cost_basis_usd * 100) if pnl is not None and cost_basis_usd else None
        return LpRealPnlPositionResponse(
            position_id=position_id,
            wallet_address=wallet_address,
            chain_id=chain_id,
            protocol=protocol,
            symbol=symbol,
            status=status,
            as_of=as_of,
            current_value_usd=current_value_usd,
            exit_value_usd=exit_value_usd,
            cost_basis_usd=cost_basis_usd,
            basis_source=basis_source,
            total_rewards_usd=total_rewards_usd,
            real_pnl_usd=pnl,
            real_pnl_pct=pnl_pct,
            data_completeness="full" if not missing else "partial",
            missing=missing,
            method=METHOD,
        )

    @staticmethod
    def _totals(positions: list[LpRealPnlPositionResponse]) -> dict:
        full_positions = [pos for pos in positions if pos.data_completeness == "full"]
        return {
            "known_total_cost_basis_usd": sum(
                (pos.cost_basis_usd or ZERO for pos in full_positions), ZERO
            ),
            "known_total_lp_value_usd": sum(
                ((pos.current_value_usd or pos.exit_value_usd or ZERO) for pos in full_positions),
                ZERO,
            ),
            "known_total_rewards_usd": sum(
                (pos.total_rewards_usd for pos in positions), ZERO
            ),
            "known_total_real_pnl_usd": sum(
                (pos.real_pnl_usd or ZERO for pos in full_positions), ZERO
            ),
            "full_positions": len(full_positions),
            "partial_positions": len(positions) - len(full_positions),
        }
