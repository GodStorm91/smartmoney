"""Transaction hashing for duplicate detection."""
import hashlib


def generate_tx_hash(
    date_str: str, amount: int, description: str, source: str
) -> str:
    """Generate SHA-256 hash for duplicate detection.

    Args:
        date_str: Transaction date as string
        amount: Transaction amount
        description: Transaction description
        source: Transaction source

    Returns:
        64-character hex hash
    """
    data = f"{date_str}|{amount}|{description}|{source}"
    return hashlib.sha256(data.encode("utf-8")).hexdigest()
