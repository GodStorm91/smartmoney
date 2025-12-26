"""Crypto wallet service for CRUD operations and sync."""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from ..models.crypto_wallet import CryptoWallet, RewardContract, CryptoSyncState, RewardClaim
from ..schemas.crypto_wallet import (
    CryptoWalletCreate,
    CryptoWalletUpdate,
    CryptoWalletWithBalanceResponse,
    RewardContractCreate,
    RewardContractUpdate,
    RewardClaimResponse,
    PortfolioResponse,
    ChainBalance,
    TokenBalance,
    CryptoSyncStateResponse,
)
from .zerion_api_service import ZerionApiService

logger = logging.getLogger(__name__)


class CryptoWalletService:
    """Service for crypto wallet operations."""

    # ==================== Wallet CRUD ====================

    @staticmethod
    def create_wallet(db: Session, user_id: int, wallet_data: CryptoWalletCreate) -> CryptoWallet:
        """Create a new crypto wallet.

        Args:
            db: Database session
            user_id: User ID
            wallet_data: Wallet creation schema

        Returns:
            Created wallet

        Raises:
            ValueError: If wallet address already registered for user
        """
        # Check for existing wallet with same address
        existing = db.query(CryptoWallet).filter(
            CryptoWallet.user_id == user_id,
            CryptoWallet.wallet_address == wallet_data.wallet_address.lower(),
            CryptoWallet.is_active == True
        ).first()
        if existing:
            raise ValueError("Wallet address already registered")

        wallet = CryptoWallet(
            user_id=user_id,
            wallet_address=wallet_data.wallet_address.lower(),
            label=wallet_data.label,
            chains=wallet_data.chains,
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

        # Initialize sync states for each chain
        for chain_id in wallet_data.chains:
            sync_state = CryptoSyncState(
                user_id=user_id,
                wallet_id=wallet.id,
                wallet_address=wallet.wallet_address,
                chain_id=chain_id,
                sync_status="pending",
            )
            db.add(sync_state)
        db.commit()

        return wallet

    @staticmethod
    def get_wallets(db: Session, user_id: int) -> list[CryptoWallet]:
        """Get all wallets for user."""
        return db.query(CryptoWallet).filter(
            CryptoWallet.user_id == user_id,
            CryptoWallet.is_active == True
        ).order_by(CryptoWallet.created_at).all()

    @staticmethod
    def get_wallet(db: Session, user_id: int, wallet_id: int) -> Optional[CryptoWallet]:
        """Get wallet by ID."""
        return db.query(CryptoWallet).filter(
            CryptoWallet.id == wallet_id,
            CryptoWallet.user_id == user_id,
            CryptoWallet.is_active == True
        ).first()

    @staticmethod
    def get_wallet_with_balance(
        db: Session, user_id: int, wallet_id: int
    ) -> Optional[CryptoWalletWithBalanceResponse]:
        """Get wallet with balance info from sync states."""
        wallet = CryptoWalletService.get_wallet(db, user_id, wallet_id)
        if not wallet:
            return None

        # Get sync states
        sync_states = db.query(CryptoSyncState).filter(
            CryptoSyncState.user_id == user_id,
            CryptoSyncState.wallet_address == wallet.wallet_address
        ).all()

        # Calculate total balance
        total_balance = Decimal("0")
        sync_state_responses = []
        for state in sync_states:
            if state.last_balance_usd:
                total_balance += state.last_balance_usd
            sync_state_responses.append(CryptoSyncStateResponse(
                id=state.id,
                wallet_address=state.wallet_address,
                chain_id=state.chain_id,
                last_sync_at=state.last_sync_at,
                last_balance_usd=state.last_balance_usd,
                sync_status=state.sync_status,
                error_message=state.error_message,
                created_at=state.created_at,
                updated_at=state.updated_at,
            ))

        return CryptoWalletWithBalanceResponse(
            id=wallet.id,
            wallet_address=wallet.wallet_address,
            label=wallet.label,
            chains=wallet.chains,
            is_active=wallet.is_active,
            created_at=wallet.created_at,
            updated_at=wallet.updated_at,
            total_balance_usd=total_balance,
            sync_statuses=sync_state_responses,
        )

    @staticmethod
    def update_wallet(
        db: Session, user_id: int, wallet_id: int, wallet_update: CryptoWalletUpdate
    ) -> Optional[CryptoWallet]:
        """Update wallet."""
        wallet = CryptoWalletService.get_wallet(db, user_id, wallet_id)
        if not wallet:
            return None

        update_data = wallet_update.model_dump(exclude_unset=True)

        # Handle chains update - create/delete sync states as needed
        if "chains" in update_data:
            new_chains = set(update_data["chains"])
            old_chains = set(wallet.chains)

            # Add sync states for new chains
            for chain_id in new_chains - old_chains:
                sync_state = CryptoSyncState(
                    user_id=user_id,
                    wallet_id=wallet.id,
                    wallet_address=wallet.wallet_address,
                    chain_id=chain_id,
                    sync_status="pending",
                )
                db.add(sync_state)

            # Remove sync states for removed chains
            for chain_id in old_chains - new_chains:
                db.query(CryptoSyncState).filter(
                    CryptoSyncState.user_id == user_id,
                    CryptoSyncState.wallet_address == wallet.wallet_address,
                    CryptoSyncState.chain_id == chain_id
                ).delete()

        for key, value in update_data.items():
            setattr(wallet, key, value)

        db.commit()
        db.refresh(wallet)
        return wallet

    @staticmethod
    def delete_wallet(db: Session, user_id: int, wallet_id: int) -> bool:
        """Soft delete wallet."""
        wallet = CryptoWalletService.get_wallet(db, user_id, wallet_id)
        if not wallet:
            return False

        wallet.is_active = False
        db.commit()
        return True

    # ==================== Reward Contract CRUD ====================

    @staticmethod
    def create_reward_contract(
        db: Session, user_id: int, contract_data: RewardContractCreate
    ) -> RewardContract:
        """Create a new reward contract."""
        # Check for existing
        existing = db.query(RewardContract).filter(
            RewardContract.user_id == user_id,
            RewardContract.chain_id == contract_data.chain_id,
            RewardContract.contract_address == contract_data.contract_address.lower(),
            RewardContract.is_active == True
        ).first()
        if existing:
            raise ValueError("Contract already registered")

        contract = RewardContract(
            user_id=user_id,
            chain_id=contract_data.chain_id,
            contract_address=contract_data.contract_address.lower(),
            label=contract_data.label,
            token_symbol=contract_data.token_symbol,
            token_decimals=contract_data.token_decimals,
        )
        db.add(contract)
        db.commit()
        db.refresh(contract)
        return contract

    @staticmethod
    def get_reward_contracts(db: Session, user_id: int) -> list[RewardContract]:
        """Get all reward contracts for user."""
        return db.query(RewardContract).filter(
            RewardContract.user_id == user_id,
            RewardContract.is_active == True
        ).order_by(RewardContract.created_at).all()

    @staticmethod
    def update_reward_contract(
        db: Session, user_id: int, contract_id: int, contract_update: RewardContractUpdate
    ) -> Optional[RewardContract]:
        """Update reward contract."""
        contract = db.query(RewardContract).filter(
            RewardContract.id == contract_id,
            RewardContract.user_id == user_id,
            RewardContract.is_active == True
        ).first()
        if not contract:
            return None

        update_data = contract_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contract, key, value)

        db.commit()
        db.refresh(contract)
        return contract

    @staticmethod
    def delete_reward_contract(db: Session, user_id: int, contract_id: int) -> bool:
        """Soft delete reward contract."""
        contract = db.query(RewardContract).filter(
            RewardContract.id == contract_id,
            RewardContract.user_id == user_id,
            RewardContract.is_active == True
        ).first()
        if not contract:
            return False

        contract.is_active = False
        db.commit()
        return True

    # ==================== Reward Claims ====================

    @staticmethod
    def get_reward_claims(db: Session, user_id: int) -> list[RewardClaim]:
        """Get all reward claims for user."""
        return db.query(RewardClaim).filter(
            RewardClaim.user_id == user_id
        ).order_by(RewardClaim.block_timestamp.desc()).all()

    @staticmethod
    async def detect_claims(db: Session, user_id: int) -> list[RewardClaimResponse]:
        """Detect new reward claims from registered contracts.

        This will be implemented in Phase 2 with Moralis API integration.
        """
        # TODO: Implement claim detection with Moralis API
        # 1. Get all user wallets and reward contracts
        # 2. For each wallet+contract pair, query token transfers
        # 3. Create RewardClaim entries for new transfers
        # 4. Optionally create Transaction entries for fiat conversion
        return []

    # ==================== Sync & Portfolio ====================

    @staticmethod
    async def sync_wallet(db: Session, user_id: int, wallet_id: int) -> Optional[PortfolioResponse]:
        """Sync wallet balances from Zerion API."""
        wallet = CryptoWalletService.get_wallet(db, user_id, wallet_id)
        if not wallet:
            return None

        # Update sync states to "syncing"
        db.query(CryptoSyncState).filter(
            CryptoSyncState.wallet_id == wallet_id
        ).update({"sync_status": "syncing", "error_message": None})
        db.commit()

        try:
            # Fetch portfolio from Zerion
            portfolio_data = await ZerionApiService.get_portfolio(
                wallet.wallet_address,
                wallet.chains
            )

            # Update sync states with results
            now = datetime.utcnow()
            for chain_data in portfolio_data.get("chains", []):
                chain_id = chain_data.get("chain_id")
                sync_state = db.query(CryptoSyncState).filter(
                    CryptoSyncState.wallet_id == wallet_id,
                    CryptoSyncState.chain_id == chain_id
                ).first()

                if sync_state:
                    sync_state.last_sync_at = now
                    sync_state.last_balance_usd = chain_data.get("total_usd", Decimal("0"))
                    sync_state.sync_status = "synced"
                    sync_state.error_message = None

            db.commit()

            # Build response
            return PortfolioResponse(
                wallet_address=wallet.wallet_address,
                total_balance_usd=Decimal(str(portfolio_data.get("total_balance_usd", 0))),
                chains=[
                    ChainBalance(
                        chain_id=c["chain_id"],
                        chain_name=c["chain_name"],
                        total_usd=Decimal(str(c.get("total_usd", 0))),
                        tokens=[TokenBalance(**t) for t in c.get("tokens", [])]
                    )
                    for c in portfolio_data.get("chains", [])
                ],
                last_sync_at=now,
            )

        except Exception as e:
            logger.error(f"Wallet sync failed: {e}")
            # Update sync states to error
            db.query(CryptoSyncState).filter(
                CryptoSyncState.wallet_id == wallet_id
            ).update({"sync_status": "error", "error_message": str(e)})
            db.commit()
            raise

    @staticmethod
    def get_portfolio(db: Session, user_id: int, wallet_id: int) -> Optional[PortfolioResponse]:
        """Get cached portfolio from last sync."""
        wallet = CryptoWalletService.get_wallet(db, user_id, wallet_id)
        if not wallet:
            return None

        sync_states = db.query(CryptoSyncState).filter(
            CryptoSyncState.user_id == user_id,
            CryptoSyncState.wallet_address == wallet.wallet_address
        ).all()

        if not sync_states or all(s.sync_status == "pending" for s in sync_states):
            return None

        total_balance = Decimal("0")
        chains = []
        last_sync = None

        for state in sync_states:
            if state.last_balance_usd:
                total_balance += state.last_balance_usd
            if state.last_sync_at:
                if not last_sync or state.last_sync_at > last_sync:
                    last_sync = state.last_sync_at

            chains.append(ChainBalance(
                chain_id=state.chain_id,
                chain_name=state.chain_id.upper(),
                total_usd=state.last_balance_usd or Decimal("0"),
                tokens=[],
            ))

        return PortfolioResponse(
            wallet_address=wallet.wallet_address,
            total_balance_usd=total_balance,
            chains=chains,
            last_sync_at=last_sync,
        )
