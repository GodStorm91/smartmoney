"""DeFiLlama API service for protocol APY data."""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Cache for pools data (refreshed hourly)
_pools_cache: dict = {"data": [], "last_updated": None}
CACHE_TTL_SECONDS = 3600  # 1 hour


class DeFiLlamaService:
    """Service for fetching protocol APY data from DeFiLlama."""

    BASE_URL = "https://yields.llama.fi"

    @staticmethod
    async def get_pools(force_refresh: bool = False) -> list[dict]:
        """Fetch all yield pools from DeFiLlama.

        Returns cached data if available and not expired.

        Args:
            force_refresh: Force refresh cache

        Returns:
            List of pool data dicts with APY info
        """
        global _pools_cache

        # Check cache
        if not force_refresh and _pools_cache["last_updated"]:
            age = (datetime.utcnow() - _pools_cache["last_updated"]).total_seconds()
            if age < CACHE_TTL_SECONDS and _pools_cache["data"]:
                logger.debug("Using cached DeFiLlama pools data")
                return _pools_cache["data"]

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{DeFiLlamaService.BASE_URL}/pools")
                response.raise_for_status()

                data = response.json()
                pools = data.get("data", [])

                # Update cache
                _pools_cache["data"] = pools
                _pools_cache["last_updated"] = datetime.utcnow()

                logger.info(f"Fetched {len(pools)} pools from DeFiLlama")
                return pools

        except httpx.HTTPStatusError as e:
            logger.error(f"DeFiLlama API error: {e.response.status_code}")
            return _pools_cache.get("data", [])
        except Exception as e:
            logger.error(f"DeFiLlama API request failed: {e}")
            return _pools_cache.get("data", [])

    @staticmethod
    async def get_pool_apy(
        project: str,
        symbol: str,
        chain: str | None = None
    ) -> Optional[dict]:
        """Find APY data for a specific pool by project and symbol.

        Args:
            project: Protocol name (e.g., "aave-v3", "uniswap-v3")
            symbol: Pool symbol (e.g., "WETH-USDC", "STETH")
            chain: Optional chain filter (e.g., "Ethereum", "Polygon")

        Returns:
            Pool data dict with APY info, or None if not found
        """
        pools = await DeFiLlamaService.get_pools()

        # Normalize for comparison
        project_lower = project.lower().replace(" ", "-").replace("_", "-")
        symbol_upper = symbol.upper()

        best_match = None
        best_score = 0

        for pool in pools:
            pool_project = pool.get("project", "").lower()
            pool_symbol = pool.get("symbol", "").upper()
            pool_chain = pool.get("chain", "")

            # Check project match
            if project_lower not in pool_project and pool_project not in project_lower:
                continue

            # Check chain if specified
            if chain and chain.lower() != pool_chain.lower():
                continue

            # Score symbol match
            score = 0
            if pool_symbol == symbol_upper:
                score = 100  # Exact match
            elif symbol_upper in pool_symbol or pool_symbol in symbol_upper:
                score = 50  # Partial match

            if score > best_score:
                best_score = score
                best_match = pool

        return best_match

    @staticmethod
    async def get_protocol_pools(project: str, chain: str | None = None) -> list[dict]:
        """Get all pools for a specific protocol.

        Args:
            project: Protocol name
            chain: Optional chain filter

        Returns:
            List of pool data for the protocol
        """
        pools = await DeFiLlamaService.get_pools()

        project_lower = project.lower().replace(" ", "-").replace("_", "-")

        result = []
        for pool in pools:
            pool_project = pool.get("project", "").lower()
            pool_chain = pool.get("chain", "")

            if project_lower in pool_project or pool_project in project_lower:
                if chain is None or chain.lower() == pool_chain.lower():
                    result.append(pool)

        return result

    @staticmethod
    def extract_apy_data(pool: dict) -> dict:
        """Extract relevant APY data from a pool dict.

        Args:
            pool: Pool data from DeFiLlama

        Returns:
            Simplified APY data dict
        """
        return {
            "pool_id": pool.get("pool"),
            "project": pool.get("project"),
            "chain": pool.get("chain"),
            "symbol": pool.get("symbol"),
            "apy": pool.get("apy"),
            "apy_base": pool.get("apyBase"),
            "apy_reward": pool.get("apyReward"),
            "apy_mean_30d": pool.get("apyMean30d"),
            "tvl_usd": pool.get("tvlUsd"),
            "il_risk": pool.get("ilRisk"),
            "il_7d": pool.get("il7d"),
            "stablecoin": pool.get("stablecoin"),
            "exposure": pool.get("exposure"),
        }

    @staticmethod
    async def match_position_to_pool(
        protocol: str,
        symbol: str,
        chain_id: str
    ) -> Optional[dict]:
        """Match a DeFi position to a DeFiLlama pool and return APY data.

        Args:
            protocol: Protocol name from Zerion (e.g., "Aave V3", "Uniswap V3")
            symbol: Position symbol (e.g., "WETH-USDC")
            chain_id: Our chain ID (e.g., "eth", "polygon", "bsc")

        Returns:
            APY data dict or None if no match
        """
        # Map our chain IDs to DeFiLlama chain names
        chain_map = {
            "eth": "Ethereum",
            "polygon": "Polygon",
            "bsc": "BSC",
            "arbitrum": "Arbitrum",
            "optimism": "Optimism",
            "base": "Base",
            "avalanche": "Avalanche",
        }

        chain_name = chain_map.get(chain_id.lower())

        pool = await DeFiLlamaService.get_pool_apy(protocol, symbol, chain_name)

        if pool:
            return DeFiLlamaService.extract_apy_data(pool)

        return None
