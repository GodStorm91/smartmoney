"""Service for closing LP positions."""
import hashlib
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.account import Account
from ..models.crypto_wallet import PositionCostBasis, PositionReward
from ..models.position_closure import PositionClosure
from ..models.transaction import Transaction
from ..schemas.position_closure import ClosePositionRequest


class PositionClosureService:
    """Service for position closure operations."""

    @staticmethod
    def close_position(
        db: Session,
        user_id: int,
        position_id: str,
        request: ClosePositionRequest,
    ) -> PositionClosure:
        """Close a position and create income transaction.

        Args:
            db: Database session
            user_id: User ID
            position_id: Zerion position ID
            request: Close position request data

        Returns:
            Created PositionClosure

        Raises:
            ValueError: If position already closed or account not found
        """
        # Check if already closed
        existing = db.query(PositionClosure).filter(
            PositionClosure.user_id == user_id,
            PositionClosure.position_id == position_id,
        ).first()
        if existing:
            raise ValueError(f"Position {position_id} already closed")

        # Verify destination account exists and is bank type
        account = db.query(Account).filter(
            Account.id == request.destination_account_id,
            Account.user_id == user_id,
            Account.is_active == True,  # noqa: E712
        ).first()
        if not account:
            raise ValueError("Destination account not found")
        if account.type not in ("bank", "savings"):
            raise ValueError("Destination must be bank or savings account")

        # Get cost basis
        cost_basis = db.query(PositionCostBasis).filter(
            PositionCostBasis.user_id == user_id,
            PositionCostBasis.position_id == position_id,
        ).first()
        cost_basis_usd = Decimal(str(cost_basis.total_usd)) if cost_basis else None

        # Sum rewards
        total_rewards = db.query(func.sum(PositionReward.reward_usd)).filter(
            PositionReward.user_id == user_id,
            PositionReward.position_id == position_id,
        ).scalar() or Decimal(0)

        # Calculate P&L
        realized_pnl_usd = None
        realized_pnl_jpy = None
        if cost_basis_usd:
            realized_pnl_usd = request.exit_value_usd - cost_basis_usd + total_rewards
            # Estimate JPY P&L (proportional to exit value ratio)
            if request.exit_value_usd > 0:
                ratio = float(realized_pnl_usd / request.exit_value_usd)
                realized_pnl_jpy = int(request.exit_value_jpy * ratio)

        # Create income transaction
        tx_hash = hashlib.sha256(
            f"{request.exit_date}|{request.exit_value_jpy}|LP Exit: {request.protocol} {request.symbol}|crypto".encode()
        ).hexdigest()

        transaction = Transaction(
            user_id=user_id,
            account_id=request.destination_account_id,
            date=request.exit_date.date(),
            amount=request.exit_value_jpy,
            currency=account.currency,
            category="Investment",
            subcategory="Crypto Exit",
            source="crypto",
            description=request.note or f"LP Exit: {request.protocol} {request.symbol}",
            is_income=True,
            is_transfer=False,
            month_key=request.exit_date.strftime("%Y-%m"),
            tx_hash=tx_hash,
        )
        db.add(transaction)
        db.flush()  # Get transaction ID

        # Create closure record
        closure = PositionClosure(
            user_id=user_id,
            position_id=position_id,
            wallet_address=request.wallet_address,
            chain_id=request.chain_id,
            protocol=request.protocol,
            symbol=request.symbol,
            exit_date=request.exit_date,
            exit_value_usd=request.exit_value_usd,
            exit_value_jpy=request.exit_value_jpy,
            exit_tx_hash=request.tx_hash,
            note=request.note,
            cost_basis_usd=cost_basis_usd,
            total_rewards_usd=total_rewards if total_rewards > 0 else None,
            realized_pnl_usd=realized_pnl_usd,
            realized_pnl_jpy=realized_pnl_jpy,
            transaction_id=transaction.id,
        )
        db.add(closure)
        db.commit()
        db.refresh(closure)

        return closure

    @staticmethod
    def get_closed_positions(
        db: Session,
        user_id: int,
    ) -> list[PositionClosure]:
        """Get all closed positions for a user."""
        return db.query(PositionClosure).filter(
            PositionClosure.user_id == user_id,
        ).order_by(PositionClosure.exit_date.desc()).all()

    @staticmethod
    def get_closed_position(
        db: Session,
        user_id: int,
        closure_id: int,
    ) -> Optional[PositionClosure]:
        """Get a specific closed position."""
        return db.query(PositionClosure).filter(
            PositionClosure.id == closure_id,
            PositionClosure.user_id == user_id,
        ).first()

    @staticmethod
    def is_position_closed(
        db: Session,
        user_id: int,
        position_id: str,
    ) -> bool:
        """Check if a position is already closed."""
        return db.query(PositionClosure).filter(
            PositionClosure.user_id == user_id,
            PositionClosure.position_id == position_id,
        ).first() is not None
