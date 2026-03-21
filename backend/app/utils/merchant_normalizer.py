"""Merchant name normalization for fuzzy matching (Layer 2.5).

Strips branch names, location suffixes, numeric IDs, and payment prefixes
so that variants like "LAWSON SHIBUYA-123" and "LAWSON ROPPONGI-456"
resolve to the same normalized merchant name.
"""
import re


# Payment prefixes to strip (e.g., "PayPay *LAWSON" -> "LAWSON")
PAYMENT_PREFIXES = re.compile(
    r"^(PayPay|LinePay|楽天ペイ|d払い|メルペイ|au PAY|Suica|PASMO)"
    r"\s*[*＊·・]\s*",
    re.IGNORECASE,
)

# Trailing numeric codes: -123, #456, DP-12345, No.789, etc.
TRAILING_CODES = re.compile(
    r"\s*(?:DP-|NO\.?|#)\s*\d+$"
    r"|\s*-\s*\d{2,}$"
    r"|\s+\d{3,}$",
    re.IGNORECASE,
)

# Japanese store/branch suffixes: 〇〇店, 〇〇支店, 〇〇駅前店, 〇〇出張所, etc.
JP_STORE_SUFFIX = re.compile(
    r"\s*[\u3000\s]*"           # optional whitespace (incl. fullwidth)
    r"[\w\u3000-\u9FFF]*?"     # location name (non-greedy)
    r"(?:駅前店|駅ナカ店|西口店|東口店|南口店|北口店|中央店"
    r"|支店|出張所|店舗|店)$"
)

# Common location words that appear after merchant names (English)
EN_LOCATION_SUFFIX = re.compile(
    r"\s+(?:SHIBUYA|SHINJUKU|IKEBUKURO|ROPPONGI|GINZA|TOKYO|OSAKA"
    r"|YOKOHAMA|NAGOYA|FUKUOKA|KYOTO|SAPPORO|KOBE|AKIHABARA"
    r"|UENO|HARAJUKU|EBISU|MEGURO|SHINAGAWA|GOTANDA)(?:\s|$)",
    re.IGNORECASE,
)


def normalize_merchant(description: str) -> str:
    """Normalize merchant name by stripping branch/location/ID suffixes.

    Used for fuzzy matching between transaction descriptions that refer
    to the same merchant but at different branches or with different IDs.

    Args:
        description: Raw transaction description.

    Returns:
        Normalized merchant name, uppercased and trimmed.
    """
    if not description:
        return ""

    text = description.strip()

    # 1. Strip payment prefixes (PayPay *LAWSON -> LAWSON)
    text = PAYMENT_PREFIXES.sub("", text)

    # 2. Strip trailing numeric codes (DP-12345, #123, -456)
    text = TRAILING_CODES.sub("", text)

    # 3. Remove Japanese store suffixes (渋谷店, 新宿西口店, etc.)
    text = JP_STORE_SUFFIX.sub("", text)

    # 4. Remove English location words after merchant name
    text = EN_LOCATION_SUFFIX.sub(" ", text)

    # 5. Collapse whitespace, strip, uppercase
    text = re.sub(r"\s+", " ", text).strip().upper()

    return text
