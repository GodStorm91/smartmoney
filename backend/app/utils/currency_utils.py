"""Currency conversion utilities."""


def convert_to_jpy(amount: int, currency: str, rates: dict[str, float]) -> int:
    """Convert amount to JPY using exchange rates.

    Args:
        amount: Amount in the source currency (cents for USD, base units otherwise)
        currency: Source currency code (JPY, USD, VND)
        rates: Dict of currency -> rate_to_jpy (e.g., {"USD": 0.00667, "VND": 160.0})

    Returns:
        Amount converted to JPY

    Note:
        - JPY amounts pass through unchanged
        - USD is stored in cents, converted to dollars first (divide by 100)
        - VND and other currencies are stored in base units
        - Rate is expressed as: 1 JPY = X foreign currency
        - To convert to JPY: amount / rate
    """
    if currency == "JPY" or currency not in rates:
        return amount

    rate = rates.get(currency, 1.0)
    if rate == 0:
        return amount

    # USD stored in cents, convert to dollars first
    actual_amount = amount / 100 if currency == "USD" else amount

    # Rate is "1 JPY = X foreign currency", so divide to get JPY
    return int(actual_amount / rate)
