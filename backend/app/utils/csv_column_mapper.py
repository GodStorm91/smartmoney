"""CSV column mapping utilities."""
import pandas as pd


class CSVParseError(Exception):
    """CSV parsing error."""

    pass


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
