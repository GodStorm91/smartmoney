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
    PositionPerformanceResponse,
    ILScenarioResponse,
    PositionInsightsResponse,
    PortfolioInsightsResponse,
    PositionRewardResponse,
    PositionRewardAttribute,
    RewardsScanRequest,
    RewardsScanResponse,
    PositionROIResponse,
    PositionCostBasisCreate,
    PositionCostBasisResponse,
    HodlScenariosResponse,
)
from ..services.crypto_wallet_service import CryptoWalletService
from ..services.defi_snapshot_service import DefiSnapshotService
from ..services.defillama_service import DeFiLlamaService
from ..services.il_calculator_service import ILCalculatorService
from ..services.defi_insights_service import DefiInsightsService

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

@router.get("/positions/{position_id:path}/history", response_model=PositionHistoryResponse)
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


# ==================== Impermanent Loss Endpoints ====================

@router.get("/positions/{position_id:path}/performance", response_model=PositionPerformanceResponse)
async def get_position_performance(
    position_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get performance metrics including IL for a DeFi position."""
    from ..models.crypto_wallet import DefiPositionSnapshot
    from sqlalchemy import and_

    # Get all snapshots for this position
    snapshots = db.query(DefiPositionSnapshot).filter(
        and_(
            DefiPositionSnapshot.user_id == current_user.id,
            DefiPositionSnapshot.position_id == position_id
        )
    ).order_by(DefiPositionSnapshot.snapshot_date.desc()).all()

    if not snapshots:
        raise HTTPException(status_code=404, detail="Position not found or no snapshots available")

    # Convert to response objects for IL calculator
    from ..schemas.crypto_wallet import DefiPositionSnapshotResponse
    snapshot_responses = [DefiPositionSnapshotResponse.model_validate(s) for s in snapshots]

    # Calculate performance with IL
    performance = ILCalculatorService.calculate_position_performance(snapshot_responses)
    if not performance:
        raise HTTPException(status_code=400, detail="Insufficient data for performance calculation (need at least 2 snapshots)")

    return PositionPerformanceResponse(**performance)


@router.get("/il/scenarios", response_model=list[ILScenarioResponse])
async def get_il_scenarios(
    current_price_ratio: float = 1.0,
    current_user: User = Depends(get_current_user),
):
    """Get IL scenarios for educational purposes.

    Shows how impermanent loss changes at various price ratios.
    Useful for understanding IL risk before entering LP positions.
    """
    scenarios = ILCalculatorService.get_il_scenarios(current_price_ratio)
    return [ILScenarioResponse(**s) for s in scenarios]


# ==================== AI Insights Endpoints ====================

@router.get("/positions/{position_id:path}/insights", response_model=PositionInsightsResponse)
async def get_position_insights(
    position_id: str,
    language: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated insights for a DeFi position.

    Provides educational analysis including:
    - Performance summary
    - Impermanent loss analysis
    - Risk assessment
    - Scenario projections
    """
    from ..models.crypto_wallet import DefiPositionSnapshot
    from sqlalchemy import and_
    from ..schemas.crypto_wallet import DefiPositionSnapshotResponse

    # Get snapshots for this position
    snapshots = db.query(DefiPositionSnapshot).filter(
        and_(
            DefiPositionSnapshot.user_id == current_user.id,
            DefiPositionSnapshot.position_id == position_id
        )
    ).order_by(DefiPositionSnapshot.snapshot_date.desc()).all()

    if not snapshots:
        raise HTTPException(status_code=404, detail="Position not found or no snapshots available")

    # Get latest snapshot for position data
    latest = snapshots[0]
    position_data = {
        "protocol": latest.protocol,
        "symbol": latest.symbol,
        "chain_id": latest.chain_id,
        "position_type": latest.position_type,
    }

    # Calculate performance metrics
    snapshot_responses = [DefiPositionSnapshotResponse.model_validate(s) for s in snapshots]
    performance_metrics = ILCalculatorService.calculate_position_performance(snapshot_responses)

    if not performance_metrics:
        raise HTTPException(status_code=400, detail="Insufficient data for insights (need at least 2 snapshots)")

    # Try to get APY data
    apy_data = None
    try:
        apy_data = await DeFiLlamaService.match_position_to_pool(
            latest.protocol, latest.symbol, latest.chain_id
        )
    except Exception:
        pass  # APY data is optional

    # Generate AI insights
    try:
        insights_service = DefiInsightsService()
        insights, usage = insights_service.generate_position_insights(
            position_data=position_data,
            performance_metrics=performance_metrics,
            apy_data=apy_data,
            language=language
        )
        return PositionInsightsResponse(**insights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


@router.get("/wallets/{wallet_id}/insights", response_model=PortfolioInsightsResponse)
async def get_portfolio_insights(
    wallet_id: int,
    language: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated insights for entire DeFi portfolio.

    Provides portfolio-level analysis including:
    - Diversification assessment
    - Risk observations
    - Allocation considerations
    """
    # Get wallet and verify ownership
    wallet = CryptoWalletService.get_wallet(db, current_user.id, wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    # Get current DeFi positions
    try:
        positions_response = await CryptoWalletService.get_defi_positions(
            db, current_user.id, wallet_id
        )
        if not positions_response or not positions_response.positions:
            raise HTTPException(status_code=400, detail="No DeFi positions found for this wallet")

        # Convert to dict format for insights service
        positions = [
            {
                "protocol": p.protocol,
                "symbol": p.symbol,
                "chain_id": p.chain_id,
                "position_type": p.position_type,
                "balance_usd": p.balance_usd,
            }
            for p in positions_response.positions
        ]
        total_value = float(positions_response.total_value_usd)

        # Generate AI insights
        insights_service = DefiInsightsService()
        insights, usage = insights_service.generate_portfolio_insights(
            positions=positions,
            total_value_usd=total_value,
            language=language
        )
        return PortfolioInsightsResponse(**insights)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate portfolio insights: {str(e)}")


# ==================== Position Reward Endpoints ====================

@router.get("/rewards", response_model=list[PositionRewardResponse])
async def get_rewards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all reward claims."""
    from ..services.reward_service import RewardService
    return RewardService.get_all_rewards(db, current_user.id)


@router.get("/rewards/unattributed", response_model=list[PositionRewardResponse])
async def get_unattributed_rewards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get unattributed rewards that need manual assignment."""
    from ..services.reward_service import RewardService
    return RewardService.get_unattributed_rewards(db, current_user.id)


@router.post("/rewards/{reward_id}/attribute", response_model=PositionRewardResponse)
async def attribute_reward(
    reward_id: int,
    body: PositionRewardAttribute,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually attribute a reward to a position."""
    from ..services.reward_matching_service import RewardMatchingService
    from ..services.reward_service import RewardService

    success = RewardMatchingService.manually_attribute_reward(
        db, current_user.id, reward_id, body.position_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Reward not found")

    reward = RewardService.get_reward_by_id(db, current_user.id, reward_id)
    return reward


@router.post("/rewards/scan", response_model=RewardsScanResponse)
async def scan_rewards(
    body: RewardsScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scan for historical Merkl claims."""
    from ..services.reward_service import RewardService

    wallets = CryptoWalletService.get_wallets(db, current_user.id)
    if not wallets:
        raise HTTPException(status_code=400, detail="No wallets registered")

    total = {"scanned_claims": 0, "new_claims": 0, "matched": 0, "unmatched": 0}
    for wallet in wallets:
        if "polygon" in wallet.chains:
            stats = await RewardService.scan_historical_claims(
                db, current_user.id, wallet.wallet_address, days=body.days
            )
            total["scanned_claims"] += stats["scanned"]
            total["new_claims"] += stats["new"]
            total["matched"] += stats["matched"]
            total["unmatched"] += stats["unmatched"]

    return RewardsScanResponse(**total)


@router.get("/positions/{position_id:path}/roi", response_model=PositionROIResponse)
async def get_position_roi(
    position_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get ROI including rewards for a position."""
    from decimal import Decimal
    from ..services.reward_service import RewardService
    from ..services.zerion_api_service import ZerionApiService

    # Get current position value from Zerion
    wallets = CryptoWalletService.get_wallets(db, current_user.id)
    current_value = Decimal(0)

    for wallet in wallets:
        positions_list = await ZerionApiService.get_defi_positions(
            wallet.wallet_address, chains=["polygon"]
        )
        for pos in positions_list:
            if pos.get("id") == position_id:
                current_value = Decimal(str(pos.get("balance_usd", 0)))
                break

    roi = await RewardService.calculate_position_roi(
        db, current_user.id, position_id, current_value
    )
    if not roi:
        raise HTTPException(status_code=404, detail="Position not found")

    return PositionROIResponse(**roi)


@router.get("/positions/{position_id:path}/rewards", response_model=list[PositionRewardResponse])
async def get_position_rewards(
    position_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all rewards for a specific position."""
    from ..services.reward_service import RewardService
    return RewardService.get_position_rewards(db, current_user.id, position_id)


# ==================== Cost Basis Endpoints ====================

@router.post("/cost-basis", response_model=PositionCostBasisResponse, status_code=201)
async def create_cost_basis(
    body: PositionCostBasisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add manual cost basis for a position."""
    from ..services.cost_basis_service import CostBasisService

    return CostBasisService.add_manual_cost_basis(
        db=db,
        user_id=current_user.id,
        **body.model_dump()
    )


@router.get("/positions/{position_id:path}/cost-basis", response_model=PositionCostBasisResponse)
async def get_position_cost_basis(
    position_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get cost basis for a position."""
    from ..services.cost_basis_service import CostBasisService

    cost_basis = CostBasisService.get_position_cost_basis(db, current_user.id, position_id)
    if not cost_basis:
        raise HTTPException(status_code=404, detail="Cost basis not found")
    return cost_basis


# ==================== HODL Scenarios Endpoints ====================

@router.post("/positions/scenarios", response_model=HodlScenariosResponse)
async def get_hodl_scenarios(
    position_ids: list[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate HODL scenarios for LP position tokens.

    Compares different strategies:
    - 100% Token A: What if all funds were in token A?
    - 100% Token B: What if all funds were in token B?
    - 50/50 HODL: What if tokens were held without LP?
    - Current LP: Actual LP position value

    Args:
        position_ids: List of position IDs for tokens in the same LP pool
    """
    from ..services.hodl_scenario_service import HodlScenarioService

    if not position_ids:
        raise HTTPException(status_code=400, detail="No position IDs provided")

    scenarios = HodlScenarioService.calculate_scenarios(
        db, current_user.id, position_ids
    )

    if not scenarios:
        raise HTTPException(
            status_code=400,
            detail="Insufficient data for scenario calculation (need at least 2 snapshots with 2+ tokens)"
        )

    return HodlScenariosResponse(**scenarios)
