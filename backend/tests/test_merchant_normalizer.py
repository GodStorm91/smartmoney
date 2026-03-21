"""Tests for merchant name normalization utility."""
import pytest

from app.utils.merchant_normalizer import normalize_merchant


class TestNormalizeMerchant:
    """Unit tests for normalize_merchant function."""

    def test_strip_trailing_numeric_with_dash(self):
        assert normalize_merchant("LAWSON SHIBUYA-123") == "LAWSON"

    def test_japanese_store_suffix(self):
        assert normalize_merchant("スターバックス 渋谷店") == "スターバックス"

    def test_dp_code_suffix(self):
        assert normalize_merchant("AMAZON.CO.JP DP-12345") == "AMAZON.CO.JP"

    def test_japanese_directional_store_suffix(self):
        assert normalize_merchant("セブンイレブン 新宿西口店") == "セブンイレブン"

    def test_japanese_station_store_suffix(self):
        assert normalize_merchant("マクドナルド 東京駅前店") == "マクドナルド"

    def test_payment_prefix_paypay(self):
        assert normalize_merchant("PayPay *LAWSON") == "LAWSON"

    def test_empty_string(self):
        assert normalize_merchant("") == ""

    def test_none_like_empty(self):
        assert normalize_merchant("  ") == ""

    def test_simple_merchant_no_change(self):
        assert normalize_merchant("COSTCO") == "COSTCO"

    def test_uppercase_normalization(self):
        assert normalize_merchant("lawson") == "LAWSON"

    def test_whitespace_collapse(self):
        assert normalize_merchant("LAWSON   SHIBUYA-456") == "LAWSON"

    def test_hash_code_suffix(self):
        assert normalize_merchant("STARBUCKS #1234") == "STARBUCKS"

    def test_branch_suffix_shitten(self):
        """支店 (branch) suffix removal."""
        assert normalize_merchant("みずほ銀行 渋谷支店") == "みずほ銀行"

    def test_location_word_removal(self):
        assert normalize_merchant("LAWSON ROPPONGI") == "LAWSON"

    def test_number_only_suffix(self):
        assert normalize_merchant("FAMILYMART 12345") == "FAMILYMART"

    def test_linepay_prefix(self):
        assert normalize_merchant("LinePay *スターバックス") == "スターバックス"

    def test_preserves_dotted_names(self):
        """Domain-like names like AMAZON.CO.JP should stay intact."""
        assert normalize_merchant("AMAZON.CO.JP") == "AMAZON.CO.JP"

    def test_japanese_merchant_no_suffix(self):
        assert normalize_merchant("スターバックス") == "スターバックス"
