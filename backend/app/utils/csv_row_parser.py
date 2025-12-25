"""CSV row parsing utilities - main dispatcher."""
import pandas as pd

from .category_mapper import map_category
from .parsers import parse_paypay_row, parse_smbc_row
from .transaction_hasher import generate_tx_hash


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

    # Check if this is SMBC format
    if column_map.get("format") == "smbc":
        return parse_smbc_row(row, column_map)

    # Generic CSV format (MoneyForward, etc.)
    return parse_generic_row(row, column_map)


def parse_generic_row(row: pd.Series, column_map: dict) -> dict | None:
    """Parse a generic CSV row (MoneyForward format).

    Args:
        row: Pandas Series representing one row
        column_map: Column mapping dictionary

    Returns:
        Transaction dictionary or None if invalid
    """
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
