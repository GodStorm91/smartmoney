"""SMBC bank statement CSV row parser."""
import pandas as pd

from ..transaction_hasher import generate_tx_hash
from .transfer_detector import is_credit_card_payment, is_internal_transfer


def parse_amount(amount_str: str) -> int | None:
    """Parse amount string (handles commas like '7,607')."""
    if pd.isna(amount_str) or amount_str == "-" or str(amount_str).strip() == "":
        return None
    clean_str = str(amount_str).replace(",", "").strip()
    try:
        return int(float(clean_str))
    except (ValueError, TypeError):
        return None


def map_smbc_category(description: str, is_income: bool) -> str:
    """Map SMBC transaction description to category.

    Args:
        description: Transaction description
        is_income: Whether this is an income transaction

    Returns:
        Category string
    """
    desc_lower = description.lower()

    if is_credit_card_payment(description):
        return "Transfer"

    if is_income:
        if "給" in description or "給与" in description or "給料" in description:
            return "Salary"
        if "振込" in description:
            return "Income"
        if "利息" in description:
            return "Interest"
        return "Income"

    if "カード" in description and "手数料" in description:
        return "Bank Fees"
    if "PE " in description or "ﾍﾟｲｼﾞ-" in description:
        return "Utilities"
    if "DF." in description:
        return "Subscription"
    if "振込" in description or "パソコン振込" in description:
        return "Transfer"
    if "ATM" in desc_lower or "ｴﾈｯﾄ" in description:
        return "ATM"

    return "Other"


def parse_smbc_row(row: pd.Series, column_map: dict) -> dict | None:
    """Parse a SMBC bank statement CSV row.

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

    amount_out = parse_amount(row[column_map["amount_out"]])
    amount_in = parse_amount(row[column_map["amount_in"]])

    if amount_out is not None and amount_out > 0:
        amount = -amount_out
        is_income = False
    elif amount_in is not None and amount_in > 0:
        amount = amount_in
        is_income = True
    else:
        return None

    description = str(row[column_map["description"]])
    if pd.isna(description) or description == "nan":
        return None

    is_transfer = is_credit_card_payment(description) or is_internal_transfer(description)
    category = map_smbc_category(description, is_income)
    source = "SMBC"

    notes = None
    if "memo" in column_map:
        memo = str(row[column_map["memo"]])
        if not pd.isna(memo) and memo != "nan" and memo.strip():
            notes = memo.strip()

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
        "notes": notes,
        "is_income": is_income,
        "is_transfer": is_transfer,
        "month_key": month_key,
        "tx_hash": tx_hash,
    }
