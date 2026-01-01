"""Transaction hashing for duplicate detection."""
import hashlib
import time
import uuid


def generate_tx_hash(
    date_str: str, amount: int, description: str, source: str,
    unique: bool = False
) -> str:
    """Generate SHA-256 hash for duplicate detection.

    Args:
        date_str: Transaction date as string
        amount: Transaction amount
        description: Transaction description
        source: Transaction source
        unique: If True, add timestamp+uuid to ensure uniqueness (for manual entry)

    Returns:
        64-character hex hash
    """
    data = f"{date_str}|{amount}|{description}|{source}"
    if unique:
        # Add timestamp and uuid for manual entries to allow similar transactions
        data += f"|{time.time()}|{uuid.uuid4().hex[:8]}"
    return hashlib.sha256(data.encode("utf-8")).hexdigest()
