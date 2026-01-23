"""Cost basis tracking service for LP positions."""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from ..models.crypto_wallet import PositionCostBasis

logger = logging.getLogger(__name__)


class CostBasisService:
    """Service for tracking position cost basis."""

    @staticmethod
    def add_manual_cost_basis(
        db: Session,
        user_id: int,
        position_id: str,
        wallet_address: str,
        chain_id: str,
        vault_address: str,
        total_usd: Decimal,
        deposited_at: datetime,
        tx_hash: str,
        token_a_symbol: Optional[str] = None,
        token_a_amount: Optional[Decimal] = None,
        token_b_symbol: Optional[str] = None,
        token_b_amount: Optional[Decimal] = None,
        block_number: Optional[int] = None,
    ) -> PositionCostBasis:
        """Add manual cost basis entry."""
        cost_basis = PositionCostBasis(
            user_id=user_id,
            position_id=position_id,
            wallet_address=wallet_address.lower(),
            chain_id=chain_id,
            vault_address=vault_address.lower(),
            token_a_symbol=token_a_symbol,
            token_a_amount=token_a_amount,
            token_b_symbol=token_b_symbol,
            token_b_amount=token_b_amount,
            total_usd=total_usd,
            deposited_at=deposited_at,
            tx_hash=tx_hash,
            block_number=block_number,
        )
        db.add(cost_basis)
        db.commit()
        db.refresh(cost_basis)
        return cost_basis

    @staticmethod
    def get_position_cost_basis(
        db: Session, user_id: int, position_id: str
    ) -> Optional[PositionCostBasis]:
        """Get cost basis for a position."""
        return db.query(PositionCostBasis).filter(
            PositionCostBasis.user_id == user_id,
            PositionCostBasis.position_id == position_id
        ).first()

    @staticmethod
    def get_all_cost_basis(db: Session, user_id: int) -> list[PositionCostBasis]:
        """Get all cost basis entries for user."""
        return db.query(PositionCostBasis).filter(
            PositionCostBasis.user_id == user_id
        ).all()

    @staticmethod
    def update_cost_basis(
        db: Session,
        user_id: int,
        position_id: str,
        total_usd: Optional[Decimal] = None,
        deposited_at: Optional[datetime] = None,
    ) -> Optional[PositionCostBasis]:
        """Update an existing cost basis entry."""
        cost_basis = CostBasisService.get_position_cost_basis(db, user_id, position_id)
        if not cost_basis:
            return None

        if total_usd is not None:
            cost_basis.total_usd = total_usd
        if deposited_at is not None:
            cost_basis.deposited_at = deposited_at

        db.commit()
        db.refresh(cost_basis)
        return cost_basis

    @staticmethod
    def delete_cost_basis(db: Session, user_id: int, position_id: str) -> bool:
        """Delete a cost basis entry."""
        cost_basis = CostBasisService.get_position_cost_basis(db, user_id, position_id)
        if not cost_basis:
            return False

        db.delete(cost_basis)
        db.commit()
        return True
