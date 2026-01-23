"""Merkl protocol service for reward tracking."""
import logging
from decimal import Decimal
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class MerklService:
    """Service for interacting with Merkl API."""

    BASE_URL = "https://api.merkl.xyz/v4"
    CHAIN_IDS = {"polygon": 137}

    @staticmethod
    async def get_user_rewards(wallet_address: str, chain: str = "polygon") -> dict:
        """Fetch current rewards for a wallet from Merkl API.

        Returns:
            dict with keys: tokens (list of token rewards with breakdowns)
        """
        chain_id = MerklService.CHAIN_IDS.get(chain, 137)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{MerklService.BASE_URL}/users/{wallet_address}/rewards"
                params = {"chainId": chain_id}

                response = await client.get(url, params=params)
                response.raise_for_status()

                return MerklService._parse_rewards_response(response.json())

        except httpx.HTTPStatusError as e:
            logger.error(f"Merkl API error: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Merkl API request failed: {e}")
            raise

    @staticmethod
    def _parse_rewards_response(data: dict) -> dict:
        """Parse Merkl rewards response.

        Expected structure:
        {
            "chain_id": {
                "token_address": {
                    "accumulated": "...",
                    "claimed": "...",
                    "pending": "...",
                    "symbol": "...",
                    "decimals": 18,
                    "breakdowns": {
                        "campaign_id": {
                            "accumulated": "...",
                            "reason": "pool_address or campaign_name"
                        }
                    }
                }
            }
        }
        """
        result = {"tokens": []}

        for chain_id, tokens in data.items():
            if not isinstance(tokens, dict):
                continue

            for token_address, token_data in tokens.items():
                if not isinstance(token_data, dict):
                    continue

                decimals = token_data.get("decimals", 18)
                divisor = Decimal(10) ** decimals

                token_info = {
                    "chain_id": chain_id,
                    "token_address": token_address.lower(),
                    "symbol": token_data.get("symbol", ""),
                    "decimals": decimals,
                    "claimed": Decimal(str(token_data.get("claimed", 0))) / divisor,
                    "pending": Decimal(str(token_data.get("pending", 0))) / divisor,
                    "accumulated": Decimal(str(token_data.get("accumulated", 0))) / divisor,
                    "breakdowns": [],
                }

                # Parse campaign breakdowns for attribution
                breakdowns = token_data.get("breakdowns", {})
                for campaign_id, breakdown in breakdowns.items():
                    if isinstance(breakdown, dict):
                        token_info["breakdowns"].append({
                            "campaign_id": campaign_id,
                            "accumulated": Decimal(str(breakdown.get("accumulated", 0))) / divisor,
                            "reason": breakdown.get("reason", ""),
                        })

                result["tokens"].append(token_info)

        return result

    @staticmethod
    def match_campaign_to_position(
        campaign_reason: str,
        positions: list[dict]
    ) -> Optional[str]:
        """Try to match a Merkl campaign to a Zerion position.

        Args:
            campaign_reason: The 'reason' field from Merkl breakdown
            positions: List of Zerion positions

        Returns:
            position_id if matched, None otherwise
        """
        campaign_reason_lower = campaign_reason.lower()

        for pos in positions:
            # Match by pool address in reason
            if pos.get("protocol_id", "").lower() in campaign_reason_lower:
                return pos["id"]

            # Match by pool name/symbol
            pos_name = pos.get("name", "").lower()
            pos_symbol = pos.get("symbol", "").lower()

            if pos_name and pos_name in campaign_reason_lower:
                return pos["id"]
            if pos_symbol and pos_symbol in campaign_reason_lower:
                return pos["id"]

        return None
