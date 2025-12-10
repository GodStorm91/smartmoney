"""Service for category rule operations."""
from collections import Counter
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.category_rule import CategoryRule
from ..models.transaction import Transaction


# Default rules for new users - common Japanese merchants/patterns
DEFAULT_RULES = [
    # Shopping
    {"keyword": "AMAZON", "category": "Shopping", "match_type": "contains", "priority": 10},
    {"keyword": "アマゾン", "category": "Shopping", "match_type": "contains", "priority": 10},
    {"keyword": "楽天市場", "category": "Shopping", "match_type": "contains", "priority": 10},
    {"keyword": "ヨドバシ", "category": "Shopping", "match_type": "contains", "priority": 10},
    {"keyword": "ビックカメラ", "category": "Shopping", "match_type": "contains", "priority": 10},
    # Convenience stores
    {"keyword": "セブン", "category": "Convenience", "match_type": "contains", "priority": 10},
    {"keyword": "ローソン", "category": "Convenience", "match_type": "contains", "priority": 10},
    {"keyword": "ファミリーマート", "category": "Convenience", "match_type": "contains", "priority": 10},
    {"keyword": "ファミマ", "category": "Convenience", "match_type": "contains", "priority": 10},
    {"keyword": "ミニストップ", "category": "Convenience", "match_type": "contains", "priority": 10},
    # Groceries
    {"keyword": "イオン", "category": "Groceries", "match_type": "contains", "priority": 10},
    {"keyword": "ヨーク", "category": "Groceries", "match_type": "contains", "priority": 10},
    {"keyword": "ライフ", "category": "Groceries", "match_type": "contains", "priority": 8},
    {"keyword": "マルエツ", "category": "Groceries", "match_type": "contains", "priority": 10},
    {"keyword": "西友", "category": "Groceries", "match_type": "contains", "priority": 10},
    # Cafe
    {"keyword": "スタバ", "category": "Cafe", "match_type": "contains", "priority": 10},
    {"keyword": "STARBUCKS", "category": "Cafe", "match_type": "contains", "priority": 10},
    {"keyword": "ドトール", "category": "Cafe", "match_type": "contains", "priority": 10},
    {"keyword": "タリーズ", "category": "Cafe", "match_type": "contains", "priority": 10},
    # Dining
    {"keyword": "マクドナルド", "category": "Dining", "match_type": "contains", "priority": 10},
    {"keyword": "吉野家", "category": "Dining", "match_type": "contains", "priority": 10},
    {"keyword": "松屋", "category": "Dining", "match_type": "contains", "priority": 10},
    {"keyword": "すき家", "category": "Dining", "match_type": "contains", "priority": 10},
    # Transportation
    {"keyword": "JR ", "category": "Transportation", "match_type": "contains", "priority": 10},
    {"keyword": "東京メトロ", "category": "Transportation", "match_type": "contains", "priority": 10},
    {"keyword": "SUICA", "category": "Transportation", "match_type": "contains", "priority": 10},
    {"keyword": "PASMO", "category": "Transportation", "match_type": "contains", "priority": 10},
    # Transfer
    {"keyword": "振込", "category": "Transfer", "match_type": "contains", "priority": 5},
    {"keyword": "振り込み", "category": "Transfer", "match_type": "contains", "priority": 5},
    # Investment
    {"keyword": "KUCOIN", "category": "Investment", "match_type": "contains", "priority": 10},
    {"keyword": "BINANCE", "category": "Investment", "match_type": "contains", "priority": 10},
    {"keyword": "コインチェック", "category": "Investment", "match_type": "contains", "priority": 10},
    # Clothing
    {"keyword": "ユニクロ", "category": "Clothing", "match_type": "contains", "priority": 10},
    {"keyword": "UNIQLO", "category": "Clothing", "match_type": "contains", "priority": 10},
    {"keyword": "GU", "category": "Clothing", "match_type": "exact", "priority": 10},
    {"keyword": "ZARA", "category": "Clothing", "match_type": "contains", "priority": 10},
]


class CategoryRuleService:
    """Service for category rule CRUD and categorization."""

    @staticmethod
    def create_rule(db: Session, user_id: int, data: dict) -> CategoryRule:
        """Create a new category rule."""
        rule = CategoryRule(user_id=user_id, **data)
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def get_rule(db: Session, user_id: int, rule_id: int) -> Optional[CategoryRule]:
        """Get a single rule by ID."""
        return db.query(CategoryRule).filter(
            CategoryRule.id == rule_id,
            CategoryRule.user_id == user_id,
        ).first()

    @staticmethod
    def list_rules(db: Session, user_id: int, active_only: bool = False) -> list[CategoryRule]:
        """List all rules for a user, ordered by priority (descending)."""
        query = db.query(CategoryRule).filter(CategoryRule.user_id == user_id)

        if active_only:
            query = query.filter(CategoryRule.is_active == True)

        return query.order_by(CategoryRule.priority.desc(), CategoryRule.id).all()

    @staticmethod
    def update_rule(
        db: Session, user_id: int, rule_id: int, update_data: dict
    ) -> Optional[CategoryRule]:
        """Update a category rule."""
        rule = db.query(CategoryRule).filter(
            CategoryRule.id == rule_id,
            CategoryRule.user_id == user_id,
        ).first()

        if not rule:
            return None

        for key, value in update_data.items():
            if hasattr(rule, key) and value is not None:
                setattr(rule, key, value)

        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def delete_rule(db: Session, user_id: int, rule_id: int) -> bool:
        """Delete a category rule."""
        rule = db.query(CategoryRule).filter(
            CategoryRule.id == rule_id,
            CategoryRule.user_id == user_id,
        ).first()

        if not rule:
            return False

        db.delete(rule)
        db.commit()
        return True

    @staticmethod
    def categorize(description: str, rules: list[CategoryRule]) -> Optional[str]:
        """Apply rules to categorize a description.

        Args:
            description: Transaction description to categorize
            rules: List of rules sorted by priority (descending)

        Returns:
            Category name if a rule matches, None otherwise
        """
        description_lower = description.lower()

        for rule in rules:
            if not rule.is_active:
                continue

            keyword_lower = rule.keyword.lower()

            if rule.match_type == "contains":
                if keyword_lower in description_lower:
                    return rule.category
            elif rule.match_type == "starts_with":
                if description_lower.startswith(keyword_lower):
                    return rule.category
            elif rule.match_type == "exact":
                if description_lower == keyword_lower:
                    return rule.category

        return None

    @staticmethod
    def apply_rules_to_transactions(
        db: Session, user_id: int, dry_run: bool = True
    ) -> dict:
        """Apply rules to existing transactions categorized as 'Other'.

        Args:
            db: Database session
            user_id: User ID
            dry_run: If True, only preview changes without applying

        Returns:
            Dictionary with affected_count and optional preview
        """
        rules = CategoryRuleService.list_rules(db, user_id, active_only=True)

        if not rules:
            return {"affected_count": 0, "preview": [] if dry_run else None}

        # Get transactions categorized as 'Other'
        other_transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.category == "Other",
        ).all()

        changes = []
        for tx in other_transactions:
            new_category = CategoryRuleService.categorize(tx.description, rules)
            if new_category:
                changes.append({
                    "id": tx.id,
                    "description": tx.description,
                    "old_category": tx.category,
                    "new_category": new_category,
                })

        if not dry_run:
            # Apply changes
            for change in changes:
                tx = db.query(Transaction).filter(Transaction.id == change["id"]).first()
                if tx:
                    tx.category = change["new_category"]
            db.commit()

        return {
            "affected_count": len(changes),
            "preview": changes[:50] if dry_run else None,  # Limit preview to 50
        }

    @staticmethod
    def suggest_rules(db: Session, user_id: int, limit: int = 10) -> list[dict]:
        """Suggest rules based on 'Other' transactions.

        Analyzes descriptions of transactions categorized as 'Other'
        and suggests keywords that appear frequently.

        Args:
            db: Database session
            user_id: User ID
            limit: Maximum suggestions to return

        Returns:
            List of suggested rules
        """
        # Get all 'Other' transactions
        other_transactions = db.query(Transaction.description).filter(
            Transaction.user_id == user_id,
            Transaction.category == "Other",
        ).all()

        if not other_transactions:
            return []

        # Count description occurrences
        description_counter = Counter(tx.description for tx in other_transactions)

        # Get most common descriptions
        suggestions = []
        for description, count in description_counter.most_common(limit * 2):
            # Skip very short descriptions
            if len(description) < 3:
                continue

            # Extract potential keyword (first significant word or whole description)
            keyword = description.split()[0] if " " in description else description

            # Skip if keyword is too short or common
            if len(keyword) < 2:
                continue

            # Suggest category based on common patterns
            suggested_category = CategoryRuleService._guess_category(description)

            suggestions.append({
                "keyword": keyword,
                "full_description": description,
                "suggested_category": suggested_category,
                "count": count,
            })

            if len(suggestions) >= limit:
                break

        return suggestions

    @staticmethod
    def _guess_category(description: str) -> str:
        """Guess a category based on common patterns."""
        desc_lower = description.lower()

        # Simple pattern matching for suggestions
        patterns = {
            "Shopping": ["amazon", "アマゾン", "楽天", "ヨドバシ"],
            "Food": ["食", "レストラン", "飲食"],
            "Convenience": ["セブン", "ローソン", "ファミマ", "コンビニ"],
            "Groceries": ["スーパー", "イオン", "ヨーク"],
            "Transportation": ["jr", "電車", "バス", "タクシー", "suica", "pasmo"],
            "Transfer": ["振込", "振り込み", "送金"],
            "Investment": ["kucoin", "binance", "株", "投資"],
            "Utilities": ["電気", "ガス", "水道", "ntt", "通信"],
        }

        for category, keywords in patterns.items():
            if any(kw in desc_lower for kw in keywords):
                return category

        return "Other"

    @staticmethod
    def seed_default_rules(db: Session, user_id: int) -> int:
        """Seed default rules for a new user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of rules created
        """
        created = 0
        for rule_data in DEFAULT_RULES:
            # Check if rule already exists
            existing = db.query(CategoryRule).filter(
                CategoryRule.user_id == user_id,
                CategoryRule.keyword == rule_data["keyword"],
            ).first()

            if not existing:
                rule = CategoryRule(user_id=user_id, **rule_data)
                db.add(rule)
                created += 1

        db.commit()
        return created
