"""Database query helpers for LP P&L calculations."""
from decimal import Decimal
from typing import Optional

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from ..models.crypto_wallet import (
    CryptoWallet,
    DefiPositionSnapshot,
    PositionReward,
)
from ..models.position_closure import PositionClosure

ZERO = Decimal("0")
PositionKey = tuple[str, str, str]


def position_key(position_id: str, wallet_address: str, chain_id: str) -> PositionKey:
    """Build a stable key for per-wallet position accounting."""
    return (position_id, wallet_address.lower(), chain_id.lower())


def get_wallet(
    db: Session,
    user_id: int,
    wallet_id: Optional[int],
) -> Optional[CryptoWallet]:
    """Get a user-owned wallet, or None when no wallet filter is requested."""
    if wallet_id is None:
        return None
    return db.query(CryptoWallet).filter(
        CryptoWallet.id == wallet_id,
        CryptoWallet.user_id == user_id,
    ).first()


def latest_snapshots(
    db: Session,
    user_id: int,
    chain: str,
    wallet_addresses: Optional[list[str]],
) -> list[DefiPositionSnapshot]:
    """Return one latest snapshot per user/wallet/position."""
    filters = [
        DefiPositionSnapshot.user_id == user_id,
        DefiPositionSnapshot.chain_id == chain,
    ]
    if wallet_addresses:
        filters.append(DefiPositionSnapshot.wallet_address.in_(wallet_addresses))

    latest = db.query(
        DefiPositionSnapshot.position_id.label("position_id"),
        DefiPositionSnapshot.wallet_address.label("wallet_address"),
        func.max(DefiPositionSnapshot.snapshot_date).label("latest_date"),
    ).filter(*filters).group_by(
        DefiPositionSnapshot.position_id,
        DefiPositionSnapshot.wallet_address,
    ).subquery()

    return db.query(DefiPositionSnapshot).join(
        latest,
        and_(
            DefiPositionSnapshot.position_id == latest.c.position_id,
            DefiPositionSnapshot.wallet_address == latest.c.wallet_address,
            DefiPositionSnapshot.snapshot_date == latest.c.latest_date,
        ),
    ).filter(*filters).order_by(
        DefiPositionSnapshot.snapshot_date.desc(),
        DefiPositionSnapshot.id.desc(),
    ).all()


def closed_positions(
    db: Session,
    user_id: int,
    chain: str,
    wallet_addresses: Optional[list[str]],
) -> list[PositionClosure]:
    """Return closed positions for a chain and optional wallet filter."""
    query = db.query(PositionClosure).filter(
        PositionClosure.user_id == user_id,
        PositionClosure.chain_id == chain,
    )
    if wallet_addresses:
        query = query.filter(PositionClosure.wallet_address.in_(wallet_addresses))
    return query.order_by(PositionClosure.exit_date.desc()).all()


def reward_totals(
    db: Session,
    user_id: int,
    chain: str,
    wallet_addresses: Optional[list[str]],
) -> dict[PositionKey, Decimal]:
    """Aggregate position-attributed rewards per position key."""
    query = db.query(
        PositionReward.position_id,
        PositionReward.wallet_address,
        PositionReward.chain_id,
        func.sum(PositionReward.reward_usd),
    ).filter(
        PositionReward.user_id == user_id,
        PositionReward.chain_id == chain,
        PositionReward.position_id.isnot(None),
    )
    if wallet_addresses:
        query = query.filter(PositionReward.wallet_address.in_(wallet_addresses))

    totals: dict[PositionKey, Decimal] = {}
    for position_id, wallet_address, chain_id, total in query.group_by(
        PositionReward.position_id,
        PositionReward.wallet_address,
        PositionReward.chain_id,
    ).all():
        totals[position_key(position_id, wallet_address, chain_id)] = (
            Decimal(str(total)) if total is not None else ZERO
        )
    return totals
