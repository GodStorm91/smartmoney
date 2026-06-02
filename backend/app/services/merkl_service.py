"""Merkl protocol service for reward tracking."""
import logging
from decimal import Decimal
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class MerklService:
    """Service for interacting with Merkl API."""

    BASE_URL = "https://api.merkl.xyz/v4"
    CHAIN_IDS = {
        "polygon": 137,
        "base": 8453,
    }

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
    def _parse_rewards_response(data) -> dict:
        """Parse Merkl v4 /users/{address}/rewards response.

        v4 shape (list of chain-grouped entries):
        [
            {
                "chain": {"id": 8453, "name": "Base", ...},
                "rewards": [
                    {
                        "amount": "987545203765856080208",
                        "claimed": "974690593785791153037",
                        "pending": "12213602735890860638",
                        "token": {"chainId": 8453, "address": "0x...", "decimals": 18, "symbol": "AIX", "price": 0.023},
                        "breakdowns": [
                            {"reason": "QUICKSWAP_ALGEBRA_12_0x...", "amount": "...", "claimed": "...", "pending": "...", "campaignId": "0x..."}
                        ]
                    }
                ]
            }
        ]

        Returns FastAPI-serializable floats (NOT Decimal) so the route can JSON-encode without a custom encoder.
        """
        result = {"tokens": []}

        if not isinstance(data, list):
            return result  # defensive: unexpected v3-style or error shape

        for chain_entry in data:
            if not isinstance(chain_entry, dict):
                continue
            chain = chain_entry.get("chain") or {}
            chain_id = chain.get("id")

            for reward in chain_entry.get("rewards") or []:
                if not isinstance(reward, dict):
                    continue

                token = reward.get("token") or {}
                decimals = token.get("decimals", 18)
                divisor = Decimal(10) ** decimals

                token_info = {
                    "chain_id": chain_id,
                    "token_address": (token.get("address") or "").lower(),
                    "symbol": token.get("symbol", ""),
                    "decimals": decimals,
                    "price_usd": token.get("price"),  # USD price per token (Merkl-enriched)
                    "claimed": float(Decimal(str(reward.get("claimed", 0))) / divisor),
                    "pending": float(Decimal(str(reward.get("pending", 0))) / divisor),
                    "accumulated": float(Decimal(str(reward.get("amount", 0))) / divisor),
                    "breakdowns": [],
                }

                for breakdown in reward.get("breakdowns") or []:
                    if isinstance(breakdown, dict):
                        token_info["breakdowns"].append({
                            "campaign_id": breakdown.get("campaignId", ""),
                            "reason": breakdown.get("reason", ""),
                            "accumulated": float(Decimal(str(breakdown.get("amount", 0))) / divisor),
                            "claimed": float(Decimal(str(breakdown.get("claimed", 0))) / divisor),
                            "pending": float(Decimal(str(breakdown.get("pending", 0))) / divisor),
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
