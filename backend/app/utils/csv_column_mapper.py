"""CSV column mapping utilities."""
import pandas as pd


class CSVParseError(Exception):
    """CSV parsing error."""

    pass


def is_paypay_format(df: pd.DataFrame) -> bool:
    """Check if the CSV is in PayPay export format."""
    paypay_columns = ["Date & Time", "Amount Outgoing (Yen)", "Business Name", "Transaction Type"]
    return all(col in df.columns for col in paypay_columns)


def is_smbc_format(df: pd.DataFrame) -> bool:
    """Check if the CSV is in SMBC bank statement format."""
    smbc_columns = ["年月日", "お引出し", "お預入れ", "お取り扱い内容", "残高"]
    return all(col in df.columns for col in smbc_columns)


def map_columns(df: pd.DataFrame, filename: str) -> dict:
    """Map CSV columns to standard field names.

    Args:
        df: Pandas DataFrame
        filename: Original filename for error messages

    Returns:
        Dictionary mapping field names to column names

    Raises:
        CSVParseError: If required columns are missing
    """
    column_map = {}

    # Check for PayPay format first
    if is_paypay_format(df):
        column_map["date"] = "Date & Time"
        column_map["description"] = "Business Name"
        column_map["amount_out"] = "Amount Outgoing (Yen)"
        column_map["amount_in"] = "Amount Incoming (Yen)"
        column_map["category"] = "Transaction Type"
        column_map["source"] = "Method"
        column_map["format"] = "paypay"
        return column_map

    # Check for SMBC format
    if is_smbc_format(df):
        column_map["date"] = "年月日"
        column_map["description"] = "お取り扱い内容"
        column_map["amount_out"] = "お引出し"  # Withdrawal
        column_map["amount_in"] = "お預入れ"  # Deposit
        column_map["balance"] = "残高"
        column_map["memo"] = "メモ"
        column_map["label"] = "ラベル"
        column_map["format"] = "smbc"
        return column_map

    # Date column
    for col in ["日付", "Date", "date"]:
        if col in df.columns:
            column_map["date"] = col
            break

    # Description column
    for col in ["内容", "詳細", "description", "Description"]:
        if col in df.columns:
            column_map["description"] = col
            break

    # Amount column
    for col in ["金額（円）", "金額", "amount", "Amount"]:
        if col in df.columns:
            column_map["amount"] = col
            break

    # Category column
    for col in ["大項目", "category", "Category"]:
        if col in df.columns:
            column_map["category"] = col
            break

    # Source column
    for col in ["保有金融機関", "口座", "source", "Source"]:
        if col in df.columns:
            column_map["source"] = col
            break

    # Optional columns
    for col in ["中項目", "subcategory", "Subcategory"]:
        if col in df.columns:
            column_map["subcategory"] = col
            break

    for col in ["振替", "transfer", "Transfer"]:
        if col in df.columns:
            column_map["transfer"] = col
            break

    for col in ["メモ", "notes", "Notes"]:
        if col in df.columns:
            column_map["notes"] = col
            break

    # Validate required columns
    required = ["date", "description", "amount", "category", "source"]
    missing = [col for col in required if col not in column_map]
    if missing:
        raise CSVParseError(
            f"Missing required columns in {filename}: {', '.join(missing)}"
        )

    return column_map
