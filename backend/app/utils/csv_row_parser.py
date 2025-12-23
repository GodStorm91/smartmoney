"""CSV row parsing utilities."""
import re

import pandas as pd

from .category_mapper import map_category
from .transaction_hasher import generate_tx_hash


def parse_paypay_amount(amount_str: str) -> int | None:
    """Parse PayPay amount string (handles commas like '7,607')."""
    if pd.isna(amount_str) or amount_str == "-" or str(amount_str).strip() == "":
        return None
    # Remove commas and convert to int
    clean_str = str(amount_str).replace(",", "").strip()
    try:
        return int(float(clean_str))
    except (ValueError, TypeError):
        return None


def map_paypay_category(tx_type: str) -> tuple[str, bool, bool]:
    """Map PayPay transaction type to category.

    Returns:
        Tuple of (category, is_income, is_transfer)
    """
    tx_type_lower = str(tx_type).lower()

    # Skip certain transaction types
    if "points" in tx_type_lower or "invested" in tx_type_lower or "top-up" in tx_type_lower:
        return ("Other", False, True)  # Mark as transfer to skip

    if "refund" in tx_type_lower:
        return ("Other", True, False)

    if "money received" in tx_type_lower:
        return ("Income", True, False)

    if "money sent" in tx_type_lower or "bank transfer" in tx_type_lower:
        return ("Transfer", False, True)

    # Default: Payment = expense
    return ("Other", False, False)


def parse_paypay_row(row: pd.Series, column_map: dict) -> dict | None:
    """Parse a PayPay CSV row.

    Args:
        row: Pandas Series representing one row
        column_map: Column mapping dictionary

    Returns:
        Transaction dictionary or None if invalid/skipped
    """
    # Parse date (format: 2025/11/30 18:09:28)
    date_str = str(row[column_map["date"]])
    try:
        date = pd.to_datetime(date_str).date()
    except Exception:
        return None

    # Parse amounts - PayPay has separate outgoing/incoming columns
    amount_out = parse_paypay_amount(row[column_map["amount_out"]])
    amount_in = parse_paypay_amount(row[column_map["amount_in"]])

    # Determine amount and income flag
    if amount_out is not None and amount_out > 0:
        amount = -amount_out  # Outgoing is negative
        is_income = False
    elif amount_in is not None and amount_in > 0:
        amount = amount_in  # Incoming is positive
        is_income = True
    else:
        return None  # No valid amount

    # Get transaction type and map to category
    tx_type = str(row[column_map["category"]])
    category, type_is_income, is_transfer = map_paypay_category(tx_type)

    # Override is_income based on transaction type
    if type_is_income:
        is_income = True

    # Skip points/investment/top-up transactions
    if is_transfer and category in ["Other", "Transfer"]:
        return None

    # Description is Business Name
    description = str(row[column_map["description"]])
    if pd.isna(description) or description == "nan" or description == "-":
        description = tx_type  # Fallback to transaction type

    # Source is payment method
    source_raw = str(row[column_map["source"]])
    if pd.isna(source_raw) or source_raw == "nan" or source_raw == "-":
        source = "PayPay"
    else:
        # Clean up source - extract main method
        source = source_raw.split(",")[0].strip()
        if "PayPay" in source:
            source = "PayPay"
        elif "Credit" in source or "Mastercard" in source:
            source = "PayPay Card"

    # Month key and hash
    month_key = date.strftime("%Y-%m")
    tx_hash = generate_tx_hash(str(date), amount, description, source)

    return {
        "date": date,
        "description": description,
        "amount": amount,
        "category": category,
        "subcategory": None,
        "source": source,
        "payment_method": None,
        "notes": None,
        "is_income": is_income,
        "is_transfer": is_transfer,
        "month_key": month_key,
        "tx_hash": tx_hash,
    }


def parse_transaction_row(row: pd.Series, column_map: dict) -> dict | None:
    """Parse a single transaction row.

    Args:
        row: Pandas Series representing one row
        column_map: Column mapping dictionary

    Returns:
        Transaction dictionary or None if invalid
    """
    # Check if this is PayPay format
    if column_map.get("format") == "paypay":
        return parse_paypay_row(row, column_map)

    # Parse date
    date_str = str(row[column_map["date"]])
    try:
        date = pd.to_datetime(date_str).date()
    except Exception:
        return None

    # Parse amount
    amount_raw = row[column_map["amount"]]
    try:
        amount = int(pd.to_numeric(amount_raw, errors="coerce"))
        if pd.isna(amount) or amount == 0:
            return None
    except Exception:
        return None

    # Determine if income or expense
    is_income = amount > 0

    # Category mapping
    category_raw = str(row[column_map["category"]])
    category = map_category(category_raw)

    if category == "Income":
        is_income = True

    # Subcategory (optional)
    subcategory = None
    if "subcategory" in column_map:
        subcategory = str(row[column_map["subcategory"]])
        if pd.isna(subcategory) or subcategory == "nan":
            subcategory = None

    # Description and source
    description = str(row[column_map["description"]])
    source = str(row[column_map["source"]])

    # Transfer flag (optional)
    is_transfer = False
    if "transfer" in column_map:
        transfer_val = row[column_map["transfer"]]
        is_transfer = transfer_val in [1, "1", True, "True"]

    # Notes (optional)
    notes = None
    if "notes" in column_map:
        notes = str(row[column_map["notes"]])
        if pd.isna(notes) or notes == "nan":
            notes = None

    # Month key and hash
    month_key = date.strftime("%Y-%m")
    tx_hash = generate_tx_hash(str(date), amount, description, source)

    return {
        "date": date,
        "description": description,
        "amount": amount,
        "category": category,
        "subcategory": subcategory,
        "source": source,
        "payment_method": None,
        "notes": notes,
        "is_income": is_income,
        "is_transfer": is_transfer,
        "month_key": month_key,
        "tx_hash": tx_hash,
    }
