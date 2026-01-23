"""PayPay CSV row parser."""
import pandas as pd

from ..transaction_hasher import generate_tx_hash


def parse_paypay_amount(amount_str: str) -> int | None:
    """Parse PayPay amount string (handles commas like '7,607')."""
    if pd.isna(amount_str) or amount_str == "-" or str(amount_str).strip() == "":
        return None
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

    if "points" in tx_type_lower or "invested" in tx_type_lower or "top-up" in tx_type_lower:
        return ("Other", False, True)

    if "refund" in tx_type_lower:
        return ("Other", True, False)

    if "money received" in tx_type_lower:
        return ("Income", True, False)

    if "money sent" in tx_type_lower or "bank transfer" in tx_type_lower:
        return ("Transfer", False, True)

    return ("Other", False, False)


def parse_paypay_row(row: pd.Series, column_map: dict) -> dict | None:
    """Parse a PayPay CSV row.

    Args:
        row: Pandas Series representing one row
        column_map: Column mapping dictionary

    Returns:
        Transaction dictionary or None if invalid/skipped
    """
    date_str = str(row[column_map["date"]])
    try:
        date = pd.to_datetime(date_str).date()
    except Exception:
        return None

    amount_out = parse_paypay_amount(row[column_map["amount_out"]])
    amount_in = parse_paypay_amount(row[column_map["amount_in"]])

    if amount_out is not None and amount_out > 0:
        amount = -amount_out
        is_income = False
    elif amount_in is not None and amount_in > 0:
        amount = amount_in
        is_income = True
    else:
        return None

    tx_type = str(row[column_map["category"]])
    category, type_is_income, is_transfer = map_paypay_category(tx_type)

    if type_is_income:
        is_income = True

    if is_transfer and category in ["Other", "Transfer"]:
        return None

    description = str(row[column_map["description"]])
    if pd.isna(description) or description == "nan" or description == "-":
        description = tx_type

    source_raw = str(row[column_map["source"]])
    if pd.isna(source_raw) or source_raw == "nan" or source_raw == "-":
        source = "PayPay"
    else:
        source = source_raw.split(",")[0].strip()
        if "PayPay" in source:
            source = "PayPay"
        elif "Credit" in source or "Mastercard" in source:
            source = "PayPay Card"

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
