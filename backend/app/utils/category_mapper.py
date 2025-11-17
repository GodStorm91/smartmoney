"""Category mapping utilities for Japanese to English translation."""

# Category mapping from Japanese to English
CATEGORY_MAPPING = {
    "食費": "Food",
    "外食": "Food",
    "住宅": "Housing",
    "水道・光熱費": "Utilities",
    "通信費": "Communication",
    "交通": "Transportation",
    "こども・教育": "Baby/Education",
    "買い物": "Shopping",
    "娯楽": "Entertainment",
    "医療・保険": "Healthcare",
    "収入": "Income",
    "その他": "Other",
}


def map_category(japanese_category: str) -> str:
    """Map Japanese category to English.

    Args:
        japanese_category: Category in Japanese

    Returns:
        English category name
    """
    return CATEGORY_MAPPING.get(japanese_category, "Other")
