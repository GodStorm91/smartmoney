"""Crypto wallet API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.crypto_wallet import (
    CryptoWalletCreate,
    CryptoWalletUpdate,
    CryptoWalletResponse,
    CryptoWalletWithBalanceResponse,
    RewardContractCreate,
    RewardContractUpdate,
    RewardContractResponse,
    RewardClaimResponse,
    PortfolioResponse,
    DefiPositionsResponse,
    PositionHistoryResponse,
    WalletPerformanceResponse,
    BackfillResponse,
)
from ..services.crypto_wallet_service import CryptoWalletService
from ..services.defi_snapshot_service import DefiSnapshotService
from ..services.defillama_service import DeFiLlamaService

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


# ==================== Crypto Wallet Endpoints ====================

@router.post("/wallets", response_model=CryptoWalletResponse, status_code=201)
async def create_wallet(
    wallet: CryptoWalletCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a new crypto wallet to track."""
    try:
        created = CryptoWalletService.create_wallet(db, current_user.id, wallet)
        return created
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/wallets", response_model=list[CryptoWalletResponse])
async def get_wallets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all registered crypto wallets."""
    return CryptoWalletService.get_wallets(db, current_user.id)


@router.get("/wallets/{wallet_id}", response_model=CryptoWalletWithBalanceResponse)
async def get_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a wallet with balance info."""
    wallet = CryptoWalletService.get_wallet_with_balance(db, current_user.id, wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet


@router.patch("/wallets/{wallet_id}", response_model=CryptoWalletResponse)
async def update_wallet(
    wallet_id: int,
    wallet_update: CryptoWalletUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a wallet."""
    updated = CryptoWalletService.update_wallet(
        db, current_user.id, wallet_id, wallet_update
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return updated


@router.delete("/wallets/{wallet_id}", status_code=204)
async def delete_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a wallet (soft delete)."""
    deleted = CryptoWalletService.delete_wallet(db, current_user.id, wallet_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return None


@router.post("/wallets/{wallet_id}/sync", response_model=PortfolioResponse)
async def sync_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a manual sync for a wallet."""
    try:
        portfolio = await CryptoWalletService.sync_wallet(db, current_user.id, wallet_id)
        if not portfolio:
            raise HTTPException(status_code=404, detail="Wallet not found")
        return portfolio
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/wallets/{wallet_id}/portfolio", response_model=PortfolioResponse)
async def get_portfolio(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get portfolio breakdown for a wallet."""
    portfolio = await CryptoWalletService.get_portfolio(db, current_user.id, wallet_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Wallet not found or not synced")
    return portfolio


@router.get("/wallets/{wallet_id}/defi-positions", response_model=DefiPositionsResponse)
async def get_defi_positions(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get DeFi/LP positions for a wallet."""
    try:
        positions = await CryptoWalletService.get_defi_positions(
            db, current_user.id, wallet_id
        )
        if not positions:
            raise HTTPException(status_code=404, detail="Wallet not found")
        return positions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch DeFi positions: {str(e)}")


# ==================== Reward Contract Endpoints ====================

@router.post("/contracts", response_model=RewardContractResponse, status_code=201)
async def create_reward_contract(
    contract: RewardContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a reward contract to monitor."""
    try:
        created = CryptoWalletService.create_reward_contract(db, current_user.id, contract)
        return created
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/contracts", response_model=list[RewardContractResponse])
async def get_reward_contracts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all registered reward contracts."""
    return CryptoWalletService.get_reward_contracts(db, current_user.id)


@router.patch("/contracts/{contract_id}", response_model=RewardContractResponse)
async def update_reward_contract(
    contract_id: int,
    contract_update: RewardContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a reward contract."""
    updated = CryptoWalletService.update_reward_contract(
        db, current_user.id, contract_id, contract_update
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Contract not found")
    return updated


@router.delete("/contracts/{contract_id}", status_code=204)
async def delete_reward_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a reward contract."""
    deleted = CryptoWalletService.delete_reward_contract(db, current_user.id, contract_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contract not found")
    return None


# ==================== Reward Claims Endpoints ====================

@router.get("/claims", response_model=list[RewardClaimResponse])
async def get_reward_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all detected reward claims."""
    return CryptoWalletService.get_reward_claims(db, current_user.id)


@router.post("/claims/detect")
async def detect_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger claim detection for all wallets."""
    try:
        new_claims = await CryptoWalletService.detect_claims(db, current_user.id)
        return {"detected": len(new_claims), "claims": new_claims}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


# ==================== DeFi Position Snapshot Endpoints ====================

@router.get("/positions/{position_id}/history", response_model=PositionHistoryResponse)
async def get_position_history(
    position_id: str,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical snapshots for a DeFi position."""
    if days not in [7, 30, 90, 365]:
        days = 30  # Default to 30 days

    history = DefiSnapshotService.get_position_history(
        db, current_user.id, position_id, days
    )
    if not history:
        raise HTTPException(status_code=404, detail="Position history not found")
    return history


@router.get("/wallets/{wallet_id}/performance", response_model=WalletPerformanceResponse)
async def get_wallet_performance(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated performance metrics for a wallet's DeFi positions."""
    performance = DefiSnapshotService.get_wallet_performance(
        db, current_user.id, wallet_id
    )
    if not performance:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return performance


@router.post("/wallets/{wallet_id}/backfill", response_model=BackfillResponse)
async def backfill_wallet_snapshots(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually backfill snapshots for a wallet (captures current state)."""
    stats = await DefiSnapshotService.backfill_snapshots(
        db, current_user.id, wallet_id
    )
    if "error" in stats:
        raise HTTPException(status_code=400, detail=stats["error"])
    return BackfillResponse(message="Backfill completed", stats=stats)


@router.post("/snapshots/capture")
async def capture_snapshots_manual(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger snapshot capture for all wallets (admin/testing)."""
    stats = await DefiSnapshotService.capture_all_snapshots(db)
    return {"message": "Snapshots captured", "stats": stats}


@router.get("/apy/{protocol}/{symbol}")
async def get_protocol_apy(
    protocol: str,
    symbol: str,
    chain: str | None = None,
    current_user: User = Depends(get_current_user),
):
    """Get current APY data for a protocol/symbol from DeFiLlama."""
    apy_data = await DeFiLlamaService.match_position_to_pool(protocol, symbol, chain or "")
    if not apy_data:
        raise HTTPException(status_code=404, detail="APY data not found for this position")
    return apy_data
