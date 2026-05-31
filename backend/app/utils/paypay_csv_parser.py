"""PayPay CSV export parser.

Handles English headers, UTF-8 BOM, split outgoing/incoming amount columns,
comma thousand separators, Transaction ID as exact dedup key.
"""
import hashlib
import io
import logging
from datetime import datetime

import pandas as pd

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {
    "Date & Time",
    "Amount Outgoing (Yen)",
    "Amount Incoming (Yen)",
    "Business Name",
    "Transaction ID",
    "Transaction Type",
}


def _parse_amount(v) -> int:
    """Convert PayPay amount string to integer yen.

    '-' → 0, '' → 0, '1,732' → 1732.
    """
    s = str(v).strip()
    if not s or s == "-":
        return 0
    return int(s.replace(",", ""))


def parse_paypay_csv(file_bytes: bytes, user_id: int) -> list[dict]:
    """Parse a PayPay CSV export into a list of transaction dicts.

    Args:
        file_bytes: Raw bytes of the uploaded CSV file (may include UTF-8 BOM).
        user_id: ID of the owning user — embedded in tx_hash for per-user dedup.

    Returns:
        List of transaction dicts matching the schema expected by
        TransactionService.bulk_create_transactions().

    Raises:
        ValueError: If required columns are missing.
    """
    df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig", dtype=str)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"PayPay CSV missing required columns: {sorted(missing)}"
        )

    out = []
    for _, row in df.iterrows():
        # Multi-currency rows are out of scope for v1 — skip + warn.
        overseas_col = "Amount Outgoing Overseas"
        if overseas_col in df.columns:
            overseas_val = str(row.get(overseas_col, "-")).strip()
            if overseas_val and overseas_val != "-":
                logger.warning(
                    "Skipping multi-currency PayPay row (overseas amount=%s, tx_id=%s)",
                    overseas_val,
                    row.get("Transaction ID", "?"),
                )
                continue

        out_amt = _parse_amount(row["Amount Outgoing (Yen)"])
        in_amt = _parse_amount(row["Amount Incoming (Yen)"])
        amount = in_amt - out_amt

        # Skip rows where net amount is zero (both columns are "-").
        if amount == 0:
            continue

        dt = datetime.strptime(row["Date & Time"].strip(), "%Y/%m/%d %H:%M:%S")
        tx_id = str(row["Transaction ID"]).strip()

        # Use Transaction ID as dedup seed — exact match via existing unique constraint.
        # Prefix with user_id to scope per-user, matching generate_tx_hash convention.
        tx_hash = hashlib.sha256(
            f"{user_id}|PAYPAY:{tx_id}".encode()
        ).hexdigest()

        is_points = "Points" in str(row["Transaction Type"])

        out.append({
            "date": dt.date(),
            "description": str(row["Business Name"]).strip(),
            "amount": abs(amount),
            "category": "Cashback" if is_points else "Other",
            "source": "PayPay",
            "is_income": amount > 0,
            "is_transfer": False,
            "month_key": dt.strftime("%Y-%m"),
            "tx_hash": tx_hash,
            "user_id": user_id,
        })

    return out
