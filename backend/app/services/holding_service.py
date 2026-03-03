"""Service for holding and lot operations."""

from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..models.holding import Holding, HoldingLot


class HoldingService:
    """Service for investment holding CRUD and calculations."""

    @staticmethod
    def create_holding(db: Session, user_id: int, data: dict) -> Holding:
        """Create a new holding.

        Args:
            db: Database session
            user_id: User ID
            data: Holding data from schema

        Returns:
            Created holding
        """
        holding = Holding(user_id=user_id, **data)
        db.add(holding)
        db.commit()
        db.refresh(holding)
        return holding

    @staticmethod
    def list_holdings(
        db: Session, user_id: int, active_only: bool = True
    ) -> list[Holding]:
        """List all holdings for a user with lots eager-loaded.

        Args:
            db: Database session
            user_id: User ID
            active_only: If True, only return active holdings

        Returns:
            List of holdings
        """
        query = (
            db.query(Holding)
            .options(joinedload(Holding.lots))
            .filter(Holding.user_id == user_id)
        )

        if active_only:
            query = query.filter(Holding.is_active == True)

        return query.order_by(Holding.created_at.desc()).all()

    @staticmethod
    def get_holding(
        db: Session, user_id: int, holding_id: int
    ) -> Optional[Holding]:
        """Get a single holding by ID with lots eager-loaded.

        Args:
            db: Database session
            user_id: User ID
            holding_id: Holding ID

        Returns:
            Holding or None
        """
        return (
            db.query(Holding)
            .options(joinedload(Holding.lots))
            .filter(
                Holding.id == holding_id,
                Holding.user_id == user_id,
            )
            .first()
        )

    @staticmethod
    def update_holding(
        db: Session, user_id: int, holding_id: int, data: dict
    ) -> Optional[Holding]:
        """Update a holding.

        Args:
            db: Database session
            user_id: User ID
            holding_id: Holding ID
            data: Fields to update

        Returns:
            Updated holding or None if not found
        """
        holding = (
            db.query(Holding)
            .filter(
                Holding.id == holding_id,
                Holding.user_id == user_id,
            )
            .first()
        )

        if not holding:
            return None

        for key, value in data.items():
            if hasattr(holding, key) and value is not None:
                setattr(holding, key, value)

        db.commit()
        db.refresh(holding)
        return holding

    @staticmethod
    def delete_holding(db: Session, user_id: int, holding_id: int) -> bool:
        """Soft-delete a holding (set is_active=False).

        Args:
            db: Database session
            user_id: User ID
            holding_id: Holding ID

        Returns:
            True if deleted, False if not found
        """
        holding = (
            db.query(Holding)
            .filter(
                Holding.id == holding_id,
                Holding.user_id == user_id,
            )
            .first()
        )

        if not holding:
            return False

        holding.is_active = False
        db.commit()
        return True

    @staticmethod
    def add_lot(
        db: Session, user_id: int, holding_id: int, data: dict
    ) -> Optional[HoldingLot]:
        """Add a lot to a holding and recalculate totals.

        Args:
            db: Database session
            user_id: User ID
            holding_id: Holding ID
            data: Lot data from schema

        Returns:
            Created lot or None if holding not found
        """
        holding = (
            db.query(Holding)
            .filter(
                Holding.id == holding_id,
                Holding.user_id == user_id,
            )
            .first()
        )

        if not holding:
            return None

        # Parse units from string to Decimal
        units_str = data.pop("units", "0")
        units = Decimal(str(units_str))

        lot = HoldingLot(
            holding_id=holding_id,
            user_id=user_id,
            units=units,
            **data,
        )
        db.add(lot)
        db.flush()

        HoldingService.recalculate_totals(db, holding)

        db.commit()
        db.refresh(lot)
        return lot

    @staticmethod
    def delete_lot(
        db: Session, user_id: int, holding_id: int, lot_id: int
    ) -> bool:
        """Delete a lot and recalculate holding totals.

        Args:
            db: Database session
            user_id: User ID
            holding_id: Holding ID
            lot_id: Lot ID

        Returns:
            True if deleted, False if not found
        """
        lot = (
            db.query(HoldingLot)
            .filter(
                HoldingLot.id == lot_id,
                HoldingLot.holding_id == holding_id,
                HoldingLot.user_id == user_id,
            )
            .first()
        )

        if not lot:
            return False

        holding = (
            db.query(Holding)
            .filter(Holding.id == holding_id, Holding.user_id == user_id)
            .first()
        )

        db.delete(lot)
        db.flush()

        if holding:
            HoldingService.recalculate_totals(db, holding)

        db.commit()
        return True

    @staticmethod
    def recalculate_totals(db: Session, holding: Holding) -> None:
        """Recalculate total_units and total_cost_basis from lots.

        Buy lots add units and cost, sell lots subtract units only.
        Dividend lots do not affect units or cost basis.

        Args:
            db: Database session
            holding: The holding to recalculate
        """
        lots = (
            db.query(HoldingLot)
            .filter(HoldingLot.holding_id == holding.id)
            .all()
        )

        total_units = Decimal("0")
        total_cost = 0

        for lot in lots:
            if lot.type == "buy":
                total_units += lot.units
                total_cost += lot.total_amount
            elif lot.type == "sell":
                total_units -= lot.units
                # Do not subtract cost on sell — cost basis tracks money in

        holding.total_units = total_units
        holding.total_cost_basis = total_cost

    @staticmethod
    def get_portfolio_summary(db: Session, user_id: int) -> dict:
        """Get portfolio summary across all active holdings.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dict with total_value, total_cost, total_pnl, pnl_percentage, holdings_count
        """
        holdings = (
            db.query(Holding)
            .filter(
                Holding.user_id == user_id,
                Holding.is_active == True,
            )
            .all()
        )

        total_value = 0
        total_cost = 0
        holdings_with_value = 0

        for h in holdings:
            total_cost += h.total_cost_basis
            if h.current_price_per_unit is not None and h.total_units > 0:
                value = int(h.total_units * h.current_price_per_unit)
                total_value += value
                holdings_with_value += 1
            else:
                # If no current price, use cost basis as proxy
                total_value += h.total_cost_basis

        total_pnl = total_value - total_cost
        pnl_percentage = (total_pnl / total_cost * 100) if total_cost > 0 else 0.0

        return {
            "total_value": total_value,
            "total_cost": total_cost,
            "total_pnl": total_pnl,
            "pnl_percentage": round(pnl_percentage, 2),
            "holdings_count": len(holdings),
        }
