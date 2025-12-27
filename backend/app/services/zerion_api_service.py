"""Zerion API service for fetching crypto portfolio data."""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

# Chain ID mapping for Zerion API
CHAIN_MAPPING = {
    "eth": "ethereum",
    "bsc": "binance-smart-chain",
    "polygon": "polygon",
    "arbitrum": "arbitrum",
    "optimism": "optimism",
}

CHAIN_NAMES = {
    "eth": "Ethereum",
    "bsc": "BNB Chain",
    "polygon": "Polygon",
    "arbitrum": "Arbitrum",
    "optimism": "Optimism",
}


class ZerionApiService:
    """Service for interacting with Zerion API."""

    BASE_URL = "https://api.zerion.io/v1"

    @staticmethod
    def _get_headers() -> dict:
        """Get headers for Zerion API requests."""
        api_key = getattr(settings, "zerion_api_key", None)
        if not api_key:
            raise ValueError("ZERION_API_KEY not configured")

        return {
            "Authorization": f"Basic {api_key}",
            "Content-Type": "application/json",
        }

    @staticmethod
    async def get_portfolio(
        wallet_address: str,
        chains: list[str] | None = None
    ) -> dict:
        """Fetch portfolio data for a wallet.

        Args:
            wallet_address: EVM wallet address (0x...)
            chains: Optional list of chain IDs to filter (eth, bsc, polygon)

        Returns:
            Portfolio data with balances per chain
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Build chain filter
                chain_filter = ""
                if chains:
                    zerion_chains = [CHAIN_MAPPING.get(c, c) for c in chains if c in CHAIN_MAPPING]
                    if zerion_chains:
                        chain_filter = f"&filter[chain_ids]={','.join(zerion_chains)}"

                url = f"{ZerionApiService.BASE_URL}/wallets/{wallet_address}/positions/?currency=usd{chain_filter}"

                response = await client.get(
                    url,
                    headers=ZerionApiService._get_headers(),
                )
                response.raise_for_status()

                data = response.json()
                return ZerionApiService._parse_portfolio(wallet_address, data, chains)

        except httpx.HTTPStatusError as e:
            logger.error(f"Zerion API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Zerion API request failed: {e}")
            raise

    @staticmethod
    def _parse_portfolio(wallet_address: str, data: dict, chains: list[str] | None) -> dict:
        """Parse Zerion portfolio response into our format."""
        positions = data.get("data", [])

        # Group by chain
        chain_balances: dict[str, dict] = {}
        total_balance = Decimal("0")

        for position in positions:
            attrs = position.get("attributes", {})
            # Chain is in relationships, not attributes
            chain_id = position.get("relationships", {}).get("chain", {}).get("data", {}).get("id")

            # Map Zerion chain to our chain ID
            our_chain_id = None
            for k, v in CHAIN_MAPPING.items():
                if v == chain_id:
                    our_chain_id = k
                    break

            if not our_chain_id:
                continue

            # Skip if chain not in filter
            if chains and our_chain_id not in chains:
                continue

            # Get position value
            value = Decimal(str(attrs.get("value", 0) or 0))
            total_balance += value

            if our_chain_id not in chain_balances:
                chain_balances[our_chain_id] = {
                    "chain_id": our_chain_id,
                    "chain_name": CHAIN_NAMES.get(our_chain_id, our_chain_id.upper()),
                    "total_usd": Decimal("0"),
                    "tokens": [],
                }

            chain_balances[our_chain_id]["total_usd"] += value

            # Parse token info
            fungible = attrs.get("fungible_info", {})
            token = {
                "chain_id": our_chain_id,
                "token_address": fungible.get("implementations", [{}])[0].get("address", ""),
                "symbol": fungible.get("symbol", ""),
                "name": fungible.get("name", ""),
                "decimals": fungible.get("implementations", [{}])[0].get("decimals", 18),
                "balance": Decimal(str(attrs.get("quantity", {}).get("float", 0) or 0)),
                "balance_usd": value,
                "price_usd": Decimal(str(attrs.get("price", 0) or 0)),
                "logo_url": fungible.get("icon", {}).get("url"),
            }
            chain_balances[our_chain_id]["tokens"].append(token)

        return {
            "wallet_address": wallet_address,
            "total_balance_usd": total_balance,
            "chains": list(chain_balances.values()),
            "last_sync_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    async def get_token_transfers(
        wallet_address: str,
        chain: str,
        from_block: Optional[int] = None,
    ) -> list[dict]:
        """Fetch token transfer history for claim detection.

        Args:
            wallet_address: Wallet address to query
            chain: Chain ID (eth, bsc, polygon)
            from_block: Optional starting block number

        Returns:
            List of incoming token transfers
        """
        try:
            zerion_chain = CHAIN_MAPPING.get(chain)
            if not zerion_chain:
                raise ValueError(f"Unsupported chain: {chain}")

            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{ZerionApiService.BASE_URL}/wallets/{wallet_address}/transactions/"
                params = {
                    "currency": "usd",
                    "filter[chain_ids]": zerion_chain,
                    "filter[operation_types]": "receive",
                    "page[size]": 100,
                }

                response = await client.get(
                    url,
                    headers=ZerionApiService._get_headers(),
                    params=params,
                )
                response.raise_for_status()

                data = response.json()
                return ZerionApiService._parse_transfers(data, from_block)

        except httpx.HTTPStatusError as e:
            logger.error(f"Zerion transfers API error: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Zerion transfers request failed: {e}")
            raise

    @staticmethod
    def _parse_transfers(data: dict, from_block: Optional[int]) -> list[dict]:
        """Parse transfer data from Zerion response."""
        transactions = data.get("data", [])
        transfers = []

        for tx in transactions:
            attrs = tx.get("attributes", {})

            # Skip if before from_block
            block = attrs.get("block_number")
            if from_block and block and block <= from_block:
                continue

            # Parse transfer details
            for transfer in attrs.get("transfers", []):
                if transfer.get("direction") != "in":
                    continue

                fungible = transfer.get("fungible_info", {})
                transfers.append({
                    "tx_hash": attrs.get("hash"),
                    "block_number": block,
                    "block_timestamp": attrs.get("mined_at"),
                    "from_address": transfer.get("sender"),
                    "token_address": fungible.get("implementations", [{}])[0].get("address"),
                    "token_symbol": fungible.get("symbol"),
                    "token_amount": Decimal(str(transfer.get("quantity", {}).get("float", 0) or 0)),
                    "fiat_value": Decimal(str(transfer.get("value", 0) or 0)),
                    "token_price": Decimal(str(transfer.get("price", 0) or 0)),
                })

        return transfers
