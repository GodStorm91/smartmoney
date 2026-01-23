"""Multi-chain blockchain scanning service via Etherscan V2 API."""
import logging
from datetime import datetime
from typing import Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

# Chain IDs for Etherscan V2 API
CHAIN_IDS = {
    "ethereum": "1",
    "eth": "1",
    "polygon": "137",
    "bsc": "56",
    "arbitrum": "42161",
    "optimism": "10",
}

# Merkl Distributor contract (same on all chains)
MERKL_DISTRIBUTOR = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae"

# Symbiotic Distributor contract (Ethereum only)
SYMBIOTIC_DISTRIBUTOR = "0x04c74E8A11c669AcFb7Ee01012BBf5CF1e57A10d"

# Claimed event: Claimed(address indexed user, address indexed token, uint256 amount)
# keccak256("Claimed(address,address,uint256)")
CLAIMED_TOPIC = "0x4ec90e965519d92681267467f775ada5bd214aa92c0dc93d90a5e880ce9ed026"


class PolygonscanService:
    """Service for scanning blockchains via Etherscan V2 API (supports multiple chains)."""

    # Use Etherscan V2 unified API
    BASE_URL = "https://api.etherscan.io/v2/api"
    POLYGON_CHAIN_ID = "137"
    ETHEREUM_CHAIN_ID = "1"

    @staticmethod
    def _get_api_key() -> str:
        api_key = settings.polygonscan_api_key
        if not api_key:
            raise ValueError("POLYGONSCAN_API_KEY not configured")
        return api_key

    @staticmethod
    async def get_merkl_claims(
        wallet_address: str,
        from_block: int = 0,
        to_block: str = "latest"
    ) -> list[dict]:
        """Fetch Merkl claim events for a wallet using token transfers.

        Uses the tokentx endpoint to find token transfers from Merkl Distributor,
        which is more reliable than getLogs after Etherscan API V2 migration.

        Args:
            wallet_address: The wallet to scan
            from_block: Starting block (0 for earliest)
            to_block: Ending block ("latest" for current)

        Returns:
            List of claim events
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "chainid": PolygonscanService.POLYGON_CHAIN_ID,
                    "module": "account",
                    "action": "tokentx",
                    "address": wallet_address.lower(),
                    "startblock": from_block,
                    "endblock": 99999999 if to_block == "latest" else to_block,
                    "sort": "desc",
                    "apikey": PolygonscanService._get_api_key(),
                }

                response = await client.get(
                    PolygonscanService.BASE_URL,
                    params=params
                )
                response.raise_for_status()

                data = response.json()
                if data.get("status") != "1":
                    if "No records found" in data.get("message", ""):
                        return []
                    logger.warning(f"Polygonscan: {data.get('message')}")
                    return []

                # Filter for transfers FROM Merkl Distributor
                return PolygonscanService._parse_token_transfers(
                    data.get("result", []),
                    wallet_address.lower()
                )

        except Exception as e:
            logger.error(f"Polygonscan API error: {e}")
            raise

    @staticmethod
    def _parse_token_transfers(transfers: list, wallet_address: str) -> list[dict]:
        """Parse token transfers from Merkl Distributor into claim records."""
        claims = []
        merkl_lower = MERKL_DISTRIBUTOR.lower()

        for tx in transfers:
            try:
                # Only include transfers FROM Merkl Distributor TO our wallet
                if tx.get("from", "").lower() != merkl_lower:
                    continue
                if tx.get("to", "").lower() != wallet_address:
                    continue

                timestamp = int(tx.get("timeStamp", 0))

                claims.append({
                    "tx_hash": tx.get("hash"),
                    "block_number": int(tx.get("blockNumber", 0)),
                    "timestamp": datetime.fromtimestamp(timestamp),
                    "token_address": tx.get("contractAddress", "").lower(),
                    "amount_raw": int(tx.get("value", 0)),
                    # Include token info from response
                    "token_symbol": tx.get("tokenSymbol"),
                    "token_decimals": int(tx.get("tokenDecimal", 18)),
                })

            except Exception as e:
                logger.warning(f"Failed to parse token transfer: {e}")
                continue

        return claims

    @staticmethod
    async def get_block_by_timestamp(timestamp: int) -> int:
        """Get block number closest to a timestamp."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "chainid": PolygonscanService.POLYGON_CHAIN_ID,
                    "module": "block",
                    "action": "getblocknobytime",
                    "timestamp": timestamp,
                    "closest": "before",
                    "apikey": PolygonscanService._get_api_key(),
                }

                response = await client.get(
                    PolygonscanService.BASE_URL,
                    params=params
                )
                response.raise_for_status()

                data = response.json()
                return int(data.get("result", 0))

        except Exception as e:
            logger.error(f"Failed to get block by timestamp: {e}")
            return 0

    @staticmethod
    async def get_token_info(token_address: str) -> dict:
        """Get token symbol and decimals via known token mappings."""
        # For MVP, use known token mappings (can be extended with contract reads later)
        KNOWN_TOKENS = {
            "0x68286607a1d43602d880d349187c3c48c0fd05e6": {"symbol": "QUICK", "decimals": 18},
            "0x580a84c73811e1839f75d86d75d88cca0c241ff4": {"symbol": "QI", "decimals": 18},
            "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270": {"symbol": "WMATIC", "decimals": 18},
            "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": {"symbol": "USDC", "decimals": 6},
            "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": {"symbol": "USDT", "decimals": 6},
            # Ethereum tokens
            "0x95cef13441be50d20ca4558cc0a27b601ac544e5": {"symbol": "MANTA", "decimals": 18},
        }
        return KNOWN_TOKENS.get(token_address.lower(), {"symbol": None, "decimals": 18})

    @staticmethod
    async def get_symbiotic_claims(
        wallet_address: str,
        from_block: int = 0,
        to_block: str = "latest"
    ) -> list[dict]:
        """Fetch Symbiotic staking reward claims for a wallet on Ethereum.

        Scans token transfers from Symbiotic Distributor contract.

        Args:
            wallet_address: The wallet to scan
            from_block: Starting block (0 for earliest)
            to_block: Ending block ("latest" for current)

        Returns:
            List of claim events
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "chainid": PolygonscanService.ETHEREUM_CHAIN_ID,
                    "module": "account",
                    "action": "tokentx",
                    "address": wallet_address.lower(),
                    "startblock": from_block,
                    "endblock": 99999999 if to_block == "latest" else to_block,
                    "sort": "desc",
                    "apikey": PolygonscanService._get_api_key(),
                }

                response = await client.get(
                    PolygonscanService.BASE_URL,
                    params=params
                )
                response.raise_for_status()

                data = response.json()
                if data.get("status") != "1":
                    if "No records found" in data.get("message", ""):
                        return []
                    logger.warning(f"Etherscan: {data.get('message')}")
                    return []

                # Filter for transfers FROM Symbiotic Distributor
                return PolygonscanService._parse_symbiotic_transfers(
                    data.get("result", []),
                    wallet_address.lower()
                )

        except Exception as e:
            logger.error(f"Etherscan API error: {e}")
            raise

    @staticmethod
    def _parse_symbiotic_transfers(transfers: list, wallet_address: str) -> list[dict]:
        """Parse token transfers from Symbiotic Distributor into claim records."""
        claims = []
        symbiotic_lower = SYMBIOTIC_DISTRIBUTOR.lower()

        for tx in transfers:
            try:
                # Only include transfers FROM Symbiotic Distributor TO our wallet
                if tx.get("from", "").lower() != symbiotic_lower:
                    continue
                if tx.get("to", "").lower() != wallet_address:
                    continue

                timestamp = int(tx.get("timeStamp", 0))

                claims.append({
                    "tx_hash": tx.get("hash"),
                    "block_number": int(tx.get("blockNumber", 0)),
                    "timestamp": datetime.fromtimestamp(timestamp),
                    "token_address": tx.get("contractAddress", "").lower(),
                    "amount_raw": int(tx.get("value", 0)),
                    "token_symbol": tx.get("tokenSymbol"),
                    "token_decimals": int(tx.get("tokenDecimal", 18)),
                })

            except Exception as e:
                logger.warning(f"Failed to parse Symbiotic transfer: {e}")
                continue

        return claims

    @staticmethod
    async def get_block_by_timestamp_eth(timestamp: int) -> int:
        """Get Ethereum block number closest to a timestamp."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "chainid": PolygonscanService.ETHEREUM_CHAIN_ID,
                    "module": "block",
                    "action": "getblocknobytime",
                    "timestamp": timestamp,
                    "closest": "before",
                    "apikey": PolygonscanService._get_api_key(),
                }

                response = await client.get(
                    PolygonscanService.BASE_URL,
                    params=params
                )
                response.raise_for_status()

                data = response.json()
                return int(data.get("result", 0))

        except Exception as e:
            logger.error(f"Failed to get ETH block by timestamp: {e}")
            return 0
