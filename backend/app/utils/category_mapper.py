"""Category mapping utilities for Japanese to English translation.

Maps to canonical parent category names from the categories table:
Food, Housing, Transportation, Entertainment, Shopping, Health, Communication, Other
"""

# Category mapping from Japanese to canonical parent category names
CATEGORY_MAPPING = {
    "食費": "Food",
    "外食": "Food",
    "住宅": "Housing",
    "水道・光熱費": "Housing",
    "通信費": "Communication",
    "交通": "Transportation",
    "こども・教育": "Other",
    "買い物": "Shopping",
    "娯楽": "Entertainment",
    "医療・保険": "Health",
    "収入": "Income",
    "その他": "Other",
    # Benchmark 家計調査 mappings
    "食料": "Food",
    "住居": "Housing",
    "光熱・水道": "Housing",
    "通信": "Communication",
    "交通・通信": "Transportation",
    "教養娯楽": "Entertainment",
    "保健医療": "Health",
    "被服": "Shopping",
    "家具・家事用品": "Shopping",
    "教育": "Other",
    "その他の消費支出": "Other",
}


def map_category(japanese_category: str) -> str:
    """Map Japanese category to English.

    Args:
        japanese_category: Category in Japanese

    Returns:
        English category name
    """
    return CATEGORY_MAPPING.get(japanese_category, "Other")
