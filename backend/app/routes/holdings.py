"""Holdings API routes for investment tracking."""

from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.holding import Holding, HoldingLot
from ..models.user import User
from ..schemas.holding import (
    HoldingCreate,
    HoldingUpdate,
    HoldingResponse,
    HoldingWithLotsResponse,
    HoldingListResponse,
    LotCreate,
    LotResponse,
    PriceUpdateRequest,
    PortfolioSummaryResponse,
)
from ..services.holding_service import HoldingService

router = APIRouter(prefix="/api/holdings", tags=["holdings"])


@router.post("/", response_model=HoldingResponse, status_code=201)
async def create_holding(
    data: HoldingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new holding."""
    holding = HoldingService.create_holding(
        db=db,
        user_id=current_user.id,
        data=data.model_dump(exclude_none=True),
    )
    return _to_response(holding)


@router.get("/", response_model=HoldingListResponse)
async def list_holdings(
    active_only: bool = Query(True, description="Only return active holdings"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all holdings for the current user."""
    holdings = HoldingService.list_holdings(
        db=db,
        user_id=current_user.id,
        active_only=active_only,
    )
    return {
        "holdings": [_to_response(h) for h in holdings],
        "total": len(holdings),
    }


@router.get("/summary", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get portfolio summary for the dashboard."""
    return HoldingService.get_portfolio_summary(
        db=db,
        user_id=current_user.id,
    )


@router.get("/{holding_id}", response_model=HoldingWithLotsResponse)
async def get_holding(
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single holding with its lots."""
    holding = HoldingService.get_holding(
        db=db,
        user_id=current_user.id,
        holding_id=holding_id,
    )
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    response = _to_response(holding)
    response["lots"] = [_lot_to_response(lot) for lot in holding.lots]
    return response


@router.patch("/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: int,
    data: HoldingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a holding."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    holding = HoldingService.update_holding(
        db=db,
        user_id=current_user.id,
        holding_id=holding_id,
        data=update_data,
    )

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    return _to_response(holding)


@router.delete("/{holding_id}", status_code=204)
async def delete_holding(
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a holding."""
    deleted = HoldingService.delete_holding(
        db=db,
        user_id=current_user.id,
        holding_id=holding_id,
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Holding not found")

    return None


@router.post("/{holding_id}/lots", response_model=LotResponse, status_code=201)
async def add_lot(
    holding_id: int,
    data: LotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a lot (buy/sell/dividend) to a holding."""
    lot = HoldingService.add_lot(
        db=db,
        user_id=current_user.id,
        holding_id=holding_id,
        data=data.model_dump(),
    )

    if not lot:
        raise HTTPException(status_code=404, detail="Holding not found")

    return _lot_to_response(lot)


@router.delete("/{holding_id}/lots/{lot_id}", status_code=204)
async def delete_lot(
    holding_id: int,
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a lot from a holding."""
    deleted = HoldingService.delete_lot(
        db=db,
        user_id=current_user.id,
        holding_id=holding_id,
        lot_id=lot_id,
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Lot not found")

    return None


@router.patch("/{holding_id}/price", response_model=HoldingResponse)
async def update_price(
    holding_id: int,
    data: PriceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick-update current price for a holding."""
    price_date = date.fromisoformat(data.date)

    holding = HoldingService.update_holding(
        db=db,
        user_id=current_user.id,
        holding_id=holding_id,
        data={
            "current_price_per_unit": data.price,
            "current_price_date": price_date,
        },
    )

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    return _to_response(holding)


def _to_response(holding: Holding) -> dict:
    """Convert Holding model to response dict with computed fields."""
    total_units = holding.total_units or Decimal("0")
    total_cost_basis = holding.total_cost_basis or 0

    # Computed fields
    avg_cost_per_unit = 0.0
    if total_units > 0 and total_cost_basis > 0:
        avg_cost_per_unit = float(total_cost_basis / total_units)

    current_value = None
    unrealized_pnl = None
    pnl_percentage = None

    if holding.current_price_per_unit is not None and total_units > 0:
        current_value = int(total_units * holding.current_price_per_unit)
        unrealized_pnl = current_value - total_cost_basis
        if total_cost_basis > 0:
            pnl_percentage = round(unrealized_pnl / total_cost_basis * 100, 2)

    return {
        "id": holding.id,
        "user_id": holding.user_id,
        "account_id": holding.account_id,
        "asset_name": holding.asset_name,
        "asset_type": holding.asset_type,
        "ticker": holding.ticker,
        "unit_label": holding.unit_label,
        "currency": holding.currency,
        "total_units": str(total_units),
        "total_cost_basis": total_cost_basis,
        "current_price_per_unit": holding.current_price_per_unit,
        "current_price_date": holding.current_price_date,
        "notes": holding.notes,
        "is_active": holding.is_active,
        "created_at": holding.created_at.isoformat(),
        "updated_at": holding.updated_at.isoformat(),
        "avg_cost_per_unit": avg_cost_per_unit,
        "current_value": current_value,
        "unrealized_pnl": unrealized_pnl,
        "pnl_percentage": pnl_percentage,
    }


def _lot_to_response(lot: HoldingLot) -> dict:
    """Convert HoldingLot model to response dict."""
    return {
        "id": lot.id,
        "holding_id": lot.holding_id,
        "user_id": lot.user_id,
        "type": lot.type,
        "date": lot.date,
        "units": str(lot.units),
        "price_per_unit": lot.price_per_unit,
        "total_amount": lot.total_amount,
        "fee_amount": lot.fee_amount,
        "notes": lot.notes,
        "created_at": lot.created_at.isoformat(),
    }
