"""CSV parser for Japanese finance app exports."""
from io import StringIO
from typing import BinaryIO

import pandas as pd

from .csv_column_mapper import CSVParseError, map_columns
from .csv_row_parser import parse_transaction_row
from .encoding_detector import detect_encoding


def parse_csv(file: BinaryIO, filename: str) -> list[dict]:
    """Parse Japanese CSV file from finance apps.

    Expected columns (Japanese):
    - 日付 (date)
    - 内容 or 詳細 (description)
    - 金額（円） or 金額 (amount)
    - 大項目 (category)
    - 中項目 (subcategory) - optional
    - 保有金融機関 or 口座 (source/account)
    - 振替 (transfer flag) - optional
    - メモ (notes) - optional

    Args:
        file: File-like object containing CSV data
        filename: Original filename for error messages

    Returns:
        List of normalized transaction dictionaries

    Raises:
        CSVParseError: If parsing fails
    """
    try:
        # Read and detect encoding
        content = file.read()
        encoding = detect_encoding(content)
        csv_string = content.decode(encoding)

        # Parse CSV with pandas
        df = pd.read_csv(
            StringIO(csv_string),
            on_bad_lines="skip",
            encoding=encoding,
        )

        # Map columns
        column_map = map_columns(df, filename)

        # Parse transactions
        transactions = []
        for idx, row in df.iterrows():
            try:
                tx = parse_transaction_row(row, column_map)
                if tx:
                    transactions.append(tx)
            except Exception:
                continue  # Skip problematic rows

        if not transactions:
            raise CSVParseError(f"No valid transactions found in {filename}")

        return transactions

    except Exception as e:
        if isinstance(e, CSVParseError):
            raise
        raise CSVParseError(f"Failed to parse {filename}: {str(e)}")
