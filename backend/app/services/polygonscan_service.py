"""Polygonscan API service for historical transaction scanning."""
import logging
from datetime import datetime
from typing import Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

# Merkl Distributor contract (same on all chains)
MERKL_DISTRIBUTOR = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae"

# Claimed event: Claimed(address indexed user, address indexed token, uint256 amount)
# keccak256("Claimed(address,address,uint256)")
CLAIMED_TOPIC = "0x4ec90e965519d92681267467f775ada5bd214aa92c0dc93d90a5e880ce9ed026"


class PolygonscanService:
    """Service for scanning Polygon blockchain via Polygonscan API."""

    BASE_URL = "https://api.polygonscan.com/api"

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
        """Fetch Merkl claim events for a wallet.

        Args:
            wallet_address: The wallet to scan
            from_block: Starting block (0 for earliest)
            to_block: Ending block ("latest" for current)

        Returns:
            List of claim events
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Pad address to 32 bytes for topic matching
                padded_address = "0x" + wallet_address[2:].lower().zfill(64)

                params = {
                    "module": "logs",
                    "action": "getLogs",
                    "fromBlock": from_block,
                    "toBlock": to_block,
                    "address": MERKL_DISTRIBUTOR,
                    "topic0": CLAIMED_TOPIC,
                    "topic1": padded_address,
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

                return PolygonscanService._parse_claim_logs(data.get("result", []))

        except Exception as e:
            logger.error(f"Polygonscan API error: {e}")
            raise

    @staticmethod
    def _parse_claim_logs(logs: list) -> list[dict]:
        """Parse Polygonscan log entries into claim records."""
        claims = []

        for log in logs:
            try:
                topics = log.get("topics", [])
                if len(topics) < 3:
                    continue

                # Topic 2 is token address (indexed)
                token_address = "0x" + topics[2][-40:]

                # Data contains amount (uint256)
                data = log.get("data", "0x")
                amount_raw = int(data, 16) if data and data != "0x" else 0

                # Parse timestamp
                timestamp_hex = log.get("timeStamp", "0x0")
                timestamp = int(timestamp_hex, 16) if timestamp_hex.startswith("0x") else int(timestamp_hex)

                claims.append({
                    "tx_hash": log.get("transactionHash"),
                    "block_number": int(log.get("blockNumber", "0x0"), 16),
                    "timestamp": datetime.fromtimestamp(timestamp),
                    "token_address": token_address.lower(),
                    "amount_raw": amount_raw,
                })

            except Exception as e:
                logger.warning(f"Failed to parse claim log: {e}")
                continue

        return claims

    @staticmethod
    async def get_block_by_timestamp(timestamp: int) -> int:
        """Get block number closest to a timestamp."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
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
        }
        return KNOWN_TOKENS.get(token_address.lower(), {"symbol": None, "decimals": 18})
