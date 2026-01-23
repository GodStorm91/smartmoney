"""Smart matching service for linking rewards to positions."""
import logging
from typing import Optional

from sqlalchemy.orm import Session

from ..models.crypto_wallet import PositionReward
from .zerion_api_service import ZerionApiService

logger = logging.getLogger(__name__)

# Known protocol → reward token mappings
PROTOCOL_REWARD_TOKENS = {
    "quickswap": ["quick", "dquick"],
    "steer protocol": ["steer"],
    "gamma": ["gamma"],
    "retro": ["retro", "oretro"],
}


class RewardMatchingService:
    """Service for matching rewards to LP positions."""

    @staticmethod
    async def match_rewards_to_positions(
        db: Session, user_id: int, wallet_address: str, chain: str = "polygon"
    ) -> dict:
        """Match unattributed rewards to user's positions."""
        positions = await ZerionApiService.get_defi_positions(wallet_address, chains=[chain])

        unattributed = db.query(PositionReward).filter(
            PositionReward.user_id == user_id,
            PositionReward.is_attributed == False,  # noqa: E712
            PositionReward.chain_id == chain
        ).all()

        matched, unmatched = 0, 0

        for reward in unattributed:
            position_id = RewardMatchingService._find_matching_position(reward, positions)
            if position_id:
                reward.position_id = position_id
                reward.is_attributed = True
                matched += 1
            else:
                unmatched += 1

        db.commit()
        return {"matched": matched, "unmatched": unmatched}

    @staticmethod
    def _find_matching_position(reward: PositionReward, positions: list[dict]) -> Optional[str]:
        """Match reward to position by token/protocol."""
        reward_symbol = (reward.reward_token_symbol or "").lower()
        campaign_id = (reward.merkl_campaign_id or "").lower()

        for pos in positions:
            protocol = pos.get("protocol", "").lower()
            pos_name = pos.get("name", "").lower()

            # Strategy 1: Campaign contains pool address
            if campaign_id:
                pos_address = pos.get("id", "").split("-")[0].lower()
                if pos_address in campaign_id:
                    return pos["id"]

            # Strategy 2: Known protocol → token mapping
            for proto_key, tokens in PROTOCOL_REWARD_TOKENS.items():
                if proto_key in protocol and reward_symbol in tokens:
                    return pos["id"]

            # Strategy 3: Token in position name
            if reward_symbol and reward_symbol in pos_name:
                return pos["id"]

        return None

    @staticmethod
    def manually_attribute_reward(db: Session, user_id: int, reward_id: int, position_id: str) -> bool:
        """Manually attribute a reward to a position."""
        reward = db.query(PositionReward).filter(
            PositionReward.id == reward_id,
            PositionReward.user_id == user_id
        ).first()

        if not reward:
            return False

        reward.position_id = position_id
        reward.is_attributed = True
        db.commit()
        return True
