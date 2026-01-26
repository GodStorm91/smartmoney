"""Transaction hashing for duplicate detection."""
import hashlib


def generate_tx_hash(
    date_str: str, amount: int, description: str, source: str, user_id: int = 0
) -> str:
    """Generate SHA-256 hash for duplicate detection.

    Args:
        date_str: Transaction date as string
        amount: Transaction amount
        description: Transaction description
        source: Transaction source
        user_id: User ID to scope hash per user

    Returns:
        64-character hex hash
    """
    data = f"{user_id}|{date_str}|{amount}|{description}|{source}"
    return hashlib.sha256(data.encode("utf-8")).hexdigest()
