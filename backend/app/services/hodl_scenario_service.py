"""HODL Scenario Service.

Calculates "what if" scenarios for LP positions:
- 100% Token A: What if all funds were in token A?
- 100% Token B: What if all funds were in token B?
- 50/50 HODL: What if tokens were held without LP?
- Current LP: Actual LP position value
"""
import logging
import re
from decimal import Decimal
from typing import Optional
from datetime import datetime

from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..models.crypto_wallet import DefiPositionSnapshot

logger = logging.getLogger(__name__)


class HodlScenarioService:
    """Service for calculating HODL scenarios for LP positions."""

    @staticmethod
    def extract_pool_name(position_id: str) -> str:
        """Extract pool name from position_id for grouping.

        Example position_id:
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619-polygon-steer protocol yield: weth/quick pool (steerqv404)-deposit'

        Returns: 'weth/quick pool (steerqv404)'
        """
        # Pattern to match pool name like "weth/quick pool (steerqv404)"
        match = re.search(r':\s*(.+?pool[^-]*)', position_id, re.IGNORECASE)
        if match:
            return match.group(1).strip()

        # Fallback: use the middle part after chain and before position_type
        parts = position_id.split('-')
        if len(parts) >= 3:
            # Join middle parts (excluding token address and position_type)
            return '-'.join(parts[2:-1])

        return position_id

    @staticmethod
    def calculate_scenarios(
        db: Session,
        user_id: int,
        position_ids: list[str],
    ) -> Optional[dict]:
        """Calculate HODL scenarios for grouped LP position tokens.

        Args:
            db: Database session
            user_id: User ID
            position_ids: List of position IDs for tokens in the same LP

        Returns:
            Dict with scenario comparisons or None if insufficient data
        """
        if not position_ids:
            return None

        # Get all snapshots for these positions
        snapshots = db.query(DefiPositionSnapshot).filter(
            and_(
                DefiPositionSnapshot.user_id == user_id,
                DefiPositionSnapshot.position_id.in_(position_ids)
            )
        ).order_by(DefiPositionSnapshot.snapshot_date.asc()).all()

        if len(snapshots) < 2:
            return None

        # Group snapshots by date
        snapshots_by_date: dict[datetime, list[DefiPositionSnapshot]] = {}
        for snap in snapshots:
            date_key = snap.snapshot_date
            if date_key not in snapshots_by_date:
                snapshots_by_date[date_key] = []
            snapshots_by_date[date_key].append(snap)

        if len(snapshots_by_date) < 2:
            return None

        # Get earliest and latest dates
        dates = sorted(snapshots_by_date.keys())
        earliest_date = dates[0]
        latest_date = dates[-1]

        earliest_snapshots = snapshots_by_date[earliest_date]
        latest_snapshots = snapshots_by_date[latest_date]

        # Need at least 2 tokens for meaningful comparison
        if len(earliest_snapshots) < 2 or len(latest_snapshots) < 2:
            return None

        # Build token data
        initial_tokens: dict[str, dict] = {}
        current_tokens: dict[str, dict] = {}

        for snap in earliest_snapshots:
            initial_tokens[snap.symbol] = {
                'symbol': snap.symbol,
                'balance': float(snap.balance),
                'balance_usd': float(snap.balance_usd),
                'price_usd': float(snap.price_usd) if snap.price_usd else (
                    float(snap.balance_usd) / float(snap.balance) if snap.balance > 0 else 0
                )
            }

        for snap in latest_snapshots:
            current_tokens[snap.symbol] = {
                'symbol': snap.symbol,
                'balance': float(snap.balance),
                'balance_usd': float(snap.balance_usd),
                'price_usd': float(snap.price_usd) if snap.price_usd else (
                    float(snap.balance_usd) / float(snap.balance) if snap.balance > 0 else 0
                )
            }

        # Calculate totals
        initial_total_usd = sum(t['balance_usd'] for t in initial_tokens.values())
        current_lp_value = sum(t['balance_usd'] for t in current_tokens.values())

        if initial_total_usd <= 0:
            return None

        # Calculate scenarios
        scenarios = []
        tokens = list(initial_tokens.keys())

        # Sort tokens alphabetically for consistent ordering
        tokens.sort()

        for token_symbol in tokens:
            if token_symbol not in initial_tokens or token_symbol not in current_tokens:
                continue

            initial_data = initial_tokens[token_symbol]
            current_data = current_tokens[token_symbol]

            initial_price = initial_data['price_usd']
            current_price = current_data['price_usd']

            if initial_price <= 0:
                continue

            # 100% this token scenario
            # If we put all initial USD into this token at initial price
            equivalent_qty = initial_total_usd / initial_price
            scenario_value = equivalent_qty * current_price
            scenario_return_pct = ((scenario_value / initial_total_usd) - 1) * 100

            scenarios.append({
                'name': f'100% {token_symbol}',
                'symbol': token_symbol,
                'type': 'single_token',
                'value_usd': round(scenario_value, 2),
                'return_pct': round(scenario_return_pct, 2),
                'return_usd': round(scenario_value - initial_total_usd, 2),
            })

        # 50/50 HODL scenario (hold original token quantities)
        hodl_value = 0
        for token_symbol in tokens:
            if token_symbol not in initial_tokens or token_symbol not in current_tokens:
                continue

            initial_qty = initial_tokens[token_symbol]['balance']
            current_price = current_tokens[token_symbol]['price_usd']
            hodl_value += initial_qty * current_price

        hodl_return_pct = ((hodl_value / initial_total_usd) - 1) * 100 if initial_total_usd > 0 else 0

        scenarios.append({
            'name': '50/50 HODL',
            'symbol': '/'.join(tokens),
            'type': 'hodl_balanced',
            'value_usd': round(hodl_value, 2),
            'return_pct': round(hodl_return_pct, 2),
            'return_usd': round(hodl_value - initial_total_usd, 2),
        })

        # Current LP scenario
        lp_return_pct = ((current_lp_value / initial_total_usd) - 1) * 100 if initial_total_usd > 0 else 0

        scenarios.append({
            'name': 'Current LP',
            'symbol': '/'.join(tokens),
            'type': 'lp',
            'value_usd': round(current_lp_value, 2),
            'return_pct': round(lp_return_pct, 2),
            'return_usd': round(current_lp_value - initial_total_usd, 2),
        })

        # Sort scenarios by value (highest first)
        scenarios.sort(key=lambda x: x['value_usd'], reverse=True)

        # Determine winner
        winner = scenarios[0] if scenarios else None

        # Calculate days held
        days_held = (latest_date - earliest_date).days

        return {
            'initial_date': earliest_date.isoformat(),
            'current_date': latest_date.isoformat(),
            'days_held': days_held,
            'initial_value_usd': round(initial_total_usd, 2),
            'tokens': tokens,
            'scenarios': scenarios,
            'winner': winner['name'] if winner else None,
            'winner_vs_lp_usd': round(winner['value_usd'] - current_lp_value, 2) if winner and winner['type'] != 'lp' else 0,
        }
