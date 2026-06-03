"""Service for position cost-basis derivation and manual overrides."""
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..models.crypto_wallet import DefiPositionSnapshot, PositionCostBasis
from ..schemas.position_cost_basis import PositionCostBasisResponse

BasisSource = Literal["manual", "derived"]
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
ZERO_TX_HASH = "0x" + "0" * 64

@dataclass(frozen=True)
class BasisValue:
    amount: Decimal
    source: BasisSource


class PositionCostBasisService:
    """Derive and override LP position cost basis."""

    @staticmethod
    def get_effective_basis_map(
        db: Session,
        user_id: int,
        chain: str,
        wallet_addresses: Optional[list[str]] = None,
    ) -> dict[tuple[str, str, str], BasisValue]:
        """Return effective basis keyed by position, wallet, and chain."""
        query = db.query(PositionCostBasis).filter(
            PositionCostBasis.user_id == user_id,
            PositionCostBasis.chain_id == chain,
        )
        if wallet_addresses:
            query = query.filter(PositionCostBasis.wallet_address.in_(wallet_addresses))

        grouped: dict[tuple[str, str, str], list[PositionCostBasis]] = {}
        for row in query.order_by(PositionCostBasis.id.asc()).all():
            key = (row.position_id, row.wallet_address.lower(), row.chain_id.lower())
            grouped.setdefault(key, []).append(row)

        result = {}
        for key, rows in grouped.items():
            basis = PositionCostBasisService._basis_from_rows(rows)
            if basis:
                result[key] = basis
        return result

    @staticmethod
    def backfill_derived_basis(db: Session, user_id: Optional[int] = None) -> dict:
        """Derive basis from each position's oldest snapshot."""
        stats = {"positions_updated": 0, "positions_skipped": 0, "errors": 0}
        query = db.query(DefiPositionSnapshot)
        if user_id is not None:
            query = query.filter(DefiPositionSnapshot.user_id == user_id)

        seen: set[tuple[int, str]] = set()
        snapshots = query.order_by(
            DefiPositionSnapshot.user_id.asc(),
            DefiPositionSnapshot.position_id.asc(),
            DefiPositionSnapshot.snapshot_date.asc(),
            DefiPositionSnapshot.id.asc(),
        ).all()

        for snapshot in snapshots:
            key = (snapshot.user_id, snapshot.position_id)
            if key in seen:
                continue
            seen.add(key)
            try:
                if PositionCostBasisService._backfill_one(db, snapshot):
                    stats["positions_updated"] += 1
                else:
                    stats["positions_skipped"] += 1
            except Exception:
                stats["errors"] += 1
        db.commit()
        return stats

    @staticmethod
    def set_manual_basis(
        db: Session,
        user_id: int,
        position_id: str,
        manual_basis_usd: Optional[Decimal],
        note: Optional[str] = None,
    ) -> PositionCostBasisResponse:
        """Set manual basis, or clear it to fall back to derived basis."""
        snapshot = PositionCostBasisService._oldest_snapshot(db, user_id, position_id)
        if not snapshot:
            raise ValueError(f"unknown position_id: {position_id}")

        rows = PositionCostBasisService._rows(db, user_id, position_id)
        # Refuse to update when duplicate rows exist — the prior implementation
        # silently nulled the manual_basis on extras, destroying data.
        # If you ever see this, the legacy-table dedupe migration needs to run first.
        if len(rows) > 1:
            raise ValueError(
                f"position_id {position_id} has {len(rows)} cost-basis rows; "
                f"ambiguous state. Resolve duplicate rows before setting manual basis."
            )
        row = rows[0] if rows else PositionCostBasisService._new_row(snapshot)
        if not rows:
            db.add(row)

        derived = Decimal(str(snapshot.balance_usd))
        row.derived_basis_usd = row.derived_basis_usd or derived
        row.derived_at = row.derived_at or datetime.utcnow()
        row.manual_basis_usd = manual_basis_usd
        row.note = note
        row.total_usd = manual_basis_usd if manual_basis_usd is not None else derived
        row.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(row)
        return PositionCostBasisService._response(row)

    @staticmethod
    def _backfill_one(db: Session, snapshot: DefiPositionSnapshot) -> bool:
        rows = PositionCostBasisService._rows(db, snapshot.user_id, snapshot.position_id)
        legacy_manual = [row for row in rows if row.manual_basis_usd is None and row.derived_basis_usd is None]
        if any(row.manual_basis_usd is not None for row in rows):
            return False
        if legacy_manual:
            # Legacy `total_usd` came from on-chain reconstruction (CostBasisService),
            # NOT user manual entry — attribute it to derived, not manual. Doing the
            # opposite would falsely tell the LLM the user asserted this number.
            rows[0].derived_basis_usd = sum((Decimal(str(row.total_usd)) for row in rows), Decimal("0"))
            rows[0].derived_at = rows[0].derived_at or datetime.utcnow()
            rows[0].note = rows[0].note or "Migrated from legacy auto-computed cost basis"
            rows[0].updated_at = datetime.utcnow()
            return True

        if not rows:
            row = PositionCostBasisService._new_row(snapshot)
            db.add(row)
            return True

        derived = Decimal(str(snapshot.balance_usd))
        row = rows[0]
        if row.derived_basis_usd == derived:
            return False
        row.derived_basis_usd = derived
        row.derived_at = datetime.utcnow()
        row.total_usd = row.manual_basis_usd or derived
        row.updated_at = datetime.utcnow()
        return True

    @staticmethod
    def _rows(db: Session, user_id: int, position_id: str) -> list[PositionCostBasis]:
        return db.query(PositionCostBasis).filter(
            PositionCostBasis.user_id == user_id,
            PositionCostBasis.position_id == position_id,
        ).order_by(PositionCostBasis.id.asc()).all()

    @staticmethod
    def _oldest_snapshot(db: Session, user_id: int, position_id: str) -> Optional[DefiPositionSnapshot]:
        return db.query(DefiPositionSnapshot).filter(
            and_(
                DefiPositionSnapshot.user_id == user_id,
                DefiPositionSnapshot.position_id == position_id,
            )
        ).order_by(DefiPositionSnapshot.snapshot_date.asc()).first()

    @staticmethod
    def _new_row(snapshot: DefiPositionSnapshot) -> PositionCostBasis:
        derived = Decimal(str(snapshot.balance_usd))
        return PositionCostBasis(
            user_id=snapshot.user_id,
            position_id=snapshot.position_id,
            wallet_address=snapshot.wallet_address,
            chain_id=snapshot.chain_id,
            vault_address=ZERO_ADDRESS,
            total_usd=derived,
            deposited_at=snapshot.snapshot_date,
            tx_hash=ZERO_TX_HASH,
            derived_basis_usd=derived,
            derived_at=datetime.utcnow(),
        )

    @staticmethod
    def _basis_from_rows(rows: list[PositionCostBasis]) -> Optional[BasisValue]:
        manual = [Decimal(str(row.manual_basis_usd)) for row in rows if row.manual_basis_usd is not None]
        if manual:
            return BasisValue(sum(manual, Decimal("0")), "manual")
        derived = next((row.derived_basis_usd for row in rows if row.derived_basis_usd is not None), None)
        if derived is not None:
            return BasisValue(Decimal(str(derived)), "derived")
        # No manual + no derived → no basis. The prior implementation summed
        # `total_usd` into a phantom "manual" basis here, which mis-attributed
        # unattributed/legacy data as user-asserted truth. Caveat doctrine wins.
        return None

    @staticmethod
    def _response(row: PositionCostBasis) -> PositionCostBasisResponse:
        basis = PositionCostBasisService._basis_from_rows([row])
        return PositionCostBasisResponse(
            position_id=row.position_id,
            manual_basis_usd=row.manual_basis_usd,
            derived_basis_usd=row.derived_basis_usd,
            effective_basis_usd=basis.amount if basis else None,
            basis_source=basis.source if basis else None,
            note=row.note,
            updated_at=row.updated_at,
        )
