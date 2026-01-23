"""Transfer detection patterns for bank transactions."""

# Credit card payment patterns - these should be marked as transfers
# to avoid double-counting with credit card transactions
CREDIT_CARD_PATTERNS = [
    "PAYPAYｶ-ﾄﾞ",  # PayPay Card
    "ﾗｸﾃﾝｶ-ﾄﾞ",  # Rakuten Card
    "ﾐﾂｲｽﾐﾄﾓｶ-ﾄﾞ",  # Mitsui Sumitomo (SMBC) Card
    "イオンｶ-ﾄﾞ",  # AEON Card
    "ｴﾎﾟｽｶ-ﾄﾞ",  # EPOS Card
    "ｾｿﾞﾝｶ-ﾄﾞ",  # SAISON Card
]

# Transfer-related patterns (internal transfers, savings, investments)
TRANSFER_PATTERNS = [
    "振込　ｸﾞｴﾝ",  # Own name transfer (self)
    "ｶ)SBIｼﾖｳｹﾝ",  # SBI Securities
    "SBI証券",
]


def is_credit_card_payment(description: str) -> bool:
    """Check if description matches credit card payment pattern."""
    for pattern in CREDIT_CARD_PATTERNS:
        if pattern in description:
            return True
    return False


def is_internal_transfer(description: str) -> bool:
    """Check if description matches internal transfer pattern."""
    for pattern in TRANSFER_PATTERNS:
        if pattern in description:
            return True
    return False
