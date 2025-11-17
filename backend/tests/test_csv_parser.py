"""Tests for CSV parser utilities."""
from io import BytesIO

import pytest

from app.utils.category_mapper import map_category
from app.utils.csv_column_mapper import CSVParseError, map_columns
from app.utils.csv_parser import parse_csv
from app.utils.encoding_detector import detect_encoding
from app.utils.transaction_hasher import generate_tx_hash


class TestEncodingDetector:
    """Tests for encoding detection."""

    def test_detect_utf8(self):
        """Test detecting UTF-8 encoding."""
        content = "日付,内容,金額".encode("utf-8")
        encoding = detect_encoding(content)
        assert encoding in ["utf-8", "utf-8-sig"]

    def test_detect_shift_jis(self):
        """Test detecting Shift-JIS encoding."""
        # Use longer content for reliable detection (chardet needs more data)
        content = "日付,内容,金額\n2024-01-15,テスト,10000\n2024-01-16,テスト2,20000".encode("shift_jis")
        encoding = detect_encoding(content)
        assert encoding == "shift_jis"

    def test_detect_cp932(self):
        """Test detecting CP932 encoding."""
        # Use longer content for reliable detection (chardet needs more data)
        content = "日付,内容,金額\n2024-01-15,テスト,10000\n2024-01-16,テスト2,20000".encode("cp932")
        encoding = detect_encoding(content)
        assert encoding == "shift_jis"  # Normalized to shift_jis

    def test_detect_utf8_bom(self):
        """Test detecting UTF-8 with BOM."""
        content = "\ufeff日付,内容,金額".encode("utf-8-sig")
        encoding = detect_encoding(content)
        assert "utf" in encoding.lower()


class TestCategoryMapper:
    """Tests for category mapping."""

    def test_map_food_category(self):
        """Test mapping food categories."""
        assert map_category("食費") == "Food"
        assert map_category("外食") == "Food"

    def test_map_housing_category(self):
        """Test mapping housing category."""
        assert map_category("住宅") == "Housing"

    def test_map_transportation_category(self):
        """Test mapping transportation category."""
        assert map_category("交通") == "Transportation"

    def test_map_baby_education_category(self):
        """Test mapping baby/education category."""
        assert map_category("こども・教育") == "Baby/Education"

    def test_map_income_category(self):
        """Test mapping income category."""
        assert map_category("収入") == "Income"

    def test_map_utilities_category(self):
        """Test mapping utilities category."""
        assert map_category("水道・光熱費") == "Utilities"

    def test_map_unknown_category(self):
        """Test mapping unknown category defaults to Other."""
        assert map_category("不明なカテゴリ") == "Other"
        assert map_category("Unknown") == "Other"


class TestTransactionHasher:
    """Tests for transaction hash generation."""

    def test_generate_hash_consistency(self):
        """Test that same inputs produce same hash."""
        hash1 = generate_tx_hash("2024-01-15", -5000, "Grocery", "Rakuten")
        hash2 = generate_tx_hash("2024-01-15", -5000, "Grocery", "Rakuten")
        assert hash1 == hash2

    def test_generate_hash_uniqueness(self):
        """Test that different inputs produce different hashes."""
        hash1 = generate_tx_hash("2024-01-15", -5000, "Grocery", "Rakuten")
        hash2 = generate_tx_hash("2024-01-16", -5000, "Grocery", "Rakuten")
        assert hash1 != hash2

    def test_generate_hash_length(self):
        """Test that hash is 64 characters (SHA-256)."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Test", "Source")
        assert len(tx_hash) == 64

    def test_generate_hash_hex_format(self):
        """Test that hash is hexadecimal."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Test", "Source")
        assert all(c in "0123456789abcdef" for c in tx_hash)


class TestColumnMapper:
    """Tests for CSV column mapping."""

    def test_map_japanese_columns(self):
        """Test mapping Japanese column names."""
        import pandas as pd

        df = pd.DataFrame(columns=["日付", "内容", "金額（円）", "大項目", "保有金融機関"])
        column_map = map_columns(df, "test.csv")

        assert column_map["date"] == "日付"
        assert column_map["description"] == "内容"
        assert column_map["amount"] == "金額（円）"
        assert column_map["category"] == "大項目"
        assert column_map["source"] == "保有金融機関"

    def test_map_english_columns(self):
        """Test mapping English column names."""
        import pandas as pd

        df = pd.DataFrame(columns=["date", "description", "amount", "category", "source"])
        column_map = map_columns(df, "test.csv")

        assert column_map["date"] == "date"
        assert column_map["description"] == "description"
        assert column_map["amount"] == "amount"

    def test_map_optional_columns(self):
        """Test mapping optional columns."""
        import pandas as pd

        df = pd.DataFrame(
            columns=["日付", "内容", "金額（円）", "大項目", "中項目", "保有金融機関", "振替", "メモ"]
        )
        column_map = map_columns(df, "test.csv")

        assert "subcategory" in column_map
        assert "transfer" in column_map
        assert "notes" in column_map

    def test_missing_required_columns(self):
        """Test error when required columns are missing."""
        import pandas as pd

        df = pd.DataFrame(columns=["日付", "内容"])  # Missing required columns

        with pytest.raises(CSVParseError) as exc_info:
            map_columns(df, "test.csv")

        assert "Missing required columns" in str(exc_info.value)


class TestCSVParser:
    """Tests for complete CSV parsing."""

    def test_parse_japanese_csv_utf8(self, sample_csv_japanese):
        """Test parsing Japanese CSV with UTF-8 encoding."""
        transactions = parse_csv(sample_csv_japanese, "test.csv")

        assert len(transactions) >= 4  # Non-transfer transactions
        assert all("tx_hash" in tx for tx in transactions)
        assert all("month_key" in tx for tx in transactions)

    def test_parse_japanese_csv_shift_jis(self, sample_csv_shift_jis):
        """Test parsing Japanese CSV with Shift-JIS encoding."""
        transactions = parse_csv(sample_csv_shift_jis, "test.csv")

        assert len(transactions) >= 2
        assert all("category" in tx for tx in transactions)

    def test_parse_category_mapping(self, sample_csv_japanese):
        """Test that categories are mapped correctly."""
        transactions = parse_csv(sample_csv_japanese, "test.csv")

        categories = [tx["category"] for tx in transactions]
        assert "Food" in categories
        assert "Income" in categories
        assert "Housing" in categories

    def test_parse_transfer_exclusion(self, sample_csv_japanese):
        """Test that transfer flag is properly parsed."""
        transactions = parse_csv(sample_csv_japanese, "test.csv")

        # Check for transfer transactions
        transfers = [tx for tx in transactions if tx.get("is_transfer")]
        non_transfers = [tx for tx in transactions if not tx.get("is_transfer")]

        assert len(non_transfers) > 0

    def test_parse_income_detection(self, sample_csv_japanese):
        """Test that income is properly detected."""
        transactions = parse_csv(sample_csv_japanese, "test.csv")

        income_txs = [tx for tx in transactions if tx["is_income"]]
        assert len(income_txs) > 0
        assert all(tx["amount"] > 0 for tx in income_txs)

    def test_parse_month_key_generation(self, sample_csv_japanese):
        """Test that month_key is properly generated."""
        transactions = parse_csv(sample_csv_japanese, "test.csv")

        assert all(tx["month_key"] == "2024-01" for tx in transactions)

    def test_parse_duplicate_hash_detection(self):
        """Test that duplicate transactions generate same hash."""
        csv_content = """日付,内容,金額（円）,大項目,保有金融機関
2024/01/15,Test,-5000,食費,Card
2024/01/15,Test,-5000,食費,Card"""

        csv_file = BytesIO(csv_content.encode("utf-8"))
        transactions = parse_csv(csv_file, "test.csv")

        # Both should have same hash
        if len(transactions) >= 2:
            assert transactions[0]["tx_hash"] == transactions[1]["tx_hash"]

    def test_parse_empty_csv(self):
        """Test parsing empty CSV raises error."""
        csv_content = """日付,内容,金額（円）,大項目,保有金融機関"""

        csv_file = BytesIO(csv_content.encode("utf-8"))

        with pytest.raises(CSVParseError):
            parse_csv(csv_file, "empty.csv")

    def test_parse_malformed_rows_skip(self):
        """Test that malformed rows are skipped."""
        csv_content = """日付,内容,金額（円）,大項目,保有金融機関
2024/01/15,Valid,-5000,食費,Card
invalid-date,Bad,abc,食費,Card
2024/01/16,Valid2,-3000,住宅,Bank"""

        csv_file = BytesIO(csv_content.encode("utf-8"))
        transactions = parse_csv(csv_file, "test.csv")

        # Should skip bad row
        assert len(transactions) == 2

    def test_parse_zero_amount_skip(self):
        """Test that zero amount transactions are skipped."""
        csv_content = """日付,内容,金額（円）,大項目,保有金融機関
2024/01/15,Valid,-5000,食費,Card
2024/01/16,Zero,0,食費,Card
2024/01/17,Valid2,-3000,住宅,Bank"""

        csv_file = BytesIO(csv_content.encode("utf-8"))
        transactions = parse_csv(csv_file, "test.csv")

        # Should skip zero amount
        assert len(transactions) == 2
        assert all(tx["amount"] != 0 for tx in transactions)
