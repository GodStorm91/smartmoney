"""Service for detecting and managing recurring transaction suggestions."""
import hashlib
import re
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean, stdev
from typing import Optional

from sqlalchemy.orm import Session

from ..models.dismissed_suggestion import DismissedSuggestion
from ..models.recurring_transaction import RecurringTransaction
from ..models.transaction import Transaction


class RecurringSuggestionService:
    """Service for detecting recurring patterns in transactions."""

    @staticmethod
    def detect_patterns(
        db: Session,
        user_id: int,
        min_occurrences: int = 3,
        lookback_days: int = 365
    ) -> list[dict]:
        """Detect recurring transaction patterns.

        Args:
            db: Database session
            user_id: User ID
            min_occurrences: Minimum number of occurrences to detect
            lookback_days: How far back to look for patterns

        Returns:
            List of suggestion dictionaries sorted by confidence
        """
        # Get transactions from lookback period
        start_date = date.today() - timedelta(days=lookback_days)
        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= start_date,
                ~Transaction.is_transfer,
                ~Transaction.is_adjustment,
            )
            .order_by(Transaction.date)
            .all()
        )

        if not transactions:
            return []

        # Get existing recurring descriptions (to filter out)
        existing_recurring = db.query(RecurringTransaction).filter(
            RecurringTransaction.user_id == user_id,
            RecurringTransaction.is_active == True,
        ).all()
        existing_descriptions = {
            RecurringSuggestionService._normalize_description(r.description)
            for r in existing_recurring
        }

        # Get dismissed suggestions
        dismissed = db.query(DismissedSuggestion).filter(
            DismissedSuggestion.user_id == user_id
        ).all()
        dismissed_hashes = {d.suggestion_hash for d in dismissed}

        # Group transactions by normalized description
        groups: dict[str, list[Transaction]] = defaultdict(list)
        for txn in transactions:
            norm_desc = RecurringSuggestionService._normalize_description(txn.description)
            groups[norm_desc].append(txn)

        # Analyze each group
        suggestions = []
        for norm_desc, txns in groups.items():
            # Skip if already exists as recurring
            if norm_desc in existing_descriptions:
                continue

            # Skip if not enough occurrences
            if len(txns) < min_occurrences:
                continue

            # Analyze pattern
            suggestion = RecurringSuggestionService._analyze_group(txns, norm_desc)
            if suggestion is None:
                continue

            # Generate hash for this suggestion
            suggestion_hash = RecurringSuggestionService._generate_hash(
                suggestion["description"],
                suggestion["amount"],
                suggestion["frequency"]
            )

            # Skip if dismissed
            if suggestion_hash in dismissed_hashes:
                continue

            suggestion["hash"] = suggestion_hash
            suggestions.append(suggestion)

        # Sort by confidence (descending)
        return sorted(suggestions, key=lambda s: -s["confidence"])

    @staticmethod
    def _normalize_description(description: str) -> str:
        """Normalize description for grouping.

        Removes dates, numbers, and normalizes whitespace.
        """
        # Lowercase
        norm = description.lower().strip()

        # Remove common date patterns
        norm = re.sub(r'\d{4}[-/]\d{2}[-/]\d{2}', '', norm)  # YYYY-MM-DD
        norm = re.sub(r'\d{2}[-/]\d{2}[-/]\d{4}', '', norm)  # DD-MM-YYYY
        norm = re.sub(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}', '', norm, flags=re.I)

        # Remove trailing numbers (often reference IDs)
        norm = re.sub(r'\s+\d+$', '', norm)

        # Normalize whitespace
        norm = re.sub(r'\s+', ' ', norm).strip()

        return norm

    @staticmethod
    def _analyze_group(txns: list[Transaction], norm_desc: str) -> Optional[dict]:
        """Analyze a group of transactions for recurring pattern.

        Returns suggestion dict if pattern detected, None otherwise.
        """
        # Sort by date
        sorted_txns = sorted(txns, key=lambda t: t.date)

        # Calculate intervals between consecutive transactions
        intervals = []
        for i in range(len(sorted_txns) - 1):
            interval = (sorted_txns[i + 1].date - sorted_txns[i].date).days
            intervals.append(interval)

        if not intervals:
            return None

        avg_interval = mean(intervals)
        interval_std = stdev(intervals) if len(intervals) > 1 else 0

        # Detect frequency
        frequency = None
        day_of_month = None
        day_of_week = None

        # Monthly pattern: ~30 days ±10, low variance
        if 20 <= avg_interval <= 40 and interval_std < 10:
            frequency = "monthly"
            # Calculate most common day of month
            days = [t.date.day for t in sorted_txns]
            day_of_month = max(set(days), key=days.count)

        # Weekly pattern: ~7 days ±2
        elif 5 <= avg_interval <= 9 and interval_std < 3:
            frequency = "weekly"
            # Calculate most common day of week
            weekdays = [t.date.weekday() for t in sorted_txns]
            day_of_week = max(set(weekdays), key=weekdays.count)

        # Bi-weekly pattern: ~14 days ±3
        elif 11 <= avg_interval <= 17 and interval_std < 5:
            frequency = "custom"
            # Will use interval_days = 14

        if frequency is None:
            return None

        # Check amount consistency (within 15%)
        amounts = [abs(t.amount) for t in sorted_txns]
        avg_amount = mean(amounts)
        if avg_amount == 0:
            return None

        amount_range = max(amounts) - min(amounts)
        if amount_range / avg_amount > 0.15:
            return None  # Amounts vary too much

        # Calculate confidence score (0-100)
        confidence = RecurringSuggestionService._calculate_confidence(
            occurrences=len(sorted_txns),
            interval_std=interval_std,
            amount_range_pct=amount_range / avg_amount if avg_amount > 0 else 1,
            recency_days=(date.today() - sorted_txns[-1].date).days
        )

        # Get most common category
        categories = [t.category for t in sorted_txns]
        most_common_category = max(set(categories), key=categories.count)

        # Get most representative description (most recent)
        representative_desc = sorted_txns[-1].description

        # Determine if income or expense
        is_income = sorted_txns[-1].is_income

        return {
            "description": representative_desc,
            "normalized_description": norm_desc,
            "amount": round(avg_amount),
            "category": most_common_category,
            "frequency": frequency,
            "day_of_month": day_of_month,
            "day_of_week": day_of_week,
            "interval_days": 14 if frequency == "custom" else None,
            "is_income": is_income,
            "occurrences": len(sorted_txns),
            "last_date": sorted_txns[-1].date.isoformat(),
            "avg_interval": round(avg_interval, 1),
            "confidence": confidence,
        }

    @staticmethod
    def _calculate_confidence(
        occurrences: int,
        interval_std: float,
        amount_range_pct: float,
        recency_days: int
    ) -> int:
        """Calculate confidence score (0-100).

        Factors:
        - More occurrences = higher confidence
        - Lower interval variance = higher confidence
        - Lower amount variance = higher confidence
        - More recent = higher confidence
        """
        score = 50  # Base score

        # Occurrences bonus (up to +25)
        if occurrences >= 12:
            score += 25
        elif occurrences >= 6:
            score += 15
        elif occurrences >= 4:
            score += 10
        else:
            score += 5

        # Interval consistency bonus (up to +15)
        if interval_std < 2:
            score += 15
        elif interval_std < 5:
            score += 10
        elif interval_std < 10:
            score += 5

        # Amount consistency bonus (up to +10)
        if amount_range_pct < 0.02:
            score += 10
        elif amount_range_pct < 0.05:
            score += 7
        elif amount_range_pct < 0.10:
            score += 3

        # Recency penalty (up to -20)
        if recency_days > 90:
            score -= 20
        elif recency_days > 60:
            score -= 10
        elif recency_days > 30:
            score -= 5

        return max(0, min(100, score))

    @staticmethod
    def _generate_hash(description: str, amount: int, frequency: str) -> str:
        """Generate unique hash for a suggestion."""
        norm_desc = RecurringSuggestionService._normalize_description(description)
        data = f"{norm_desc}|{amount}|{frequency}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    @staticmethod
    def dismiss_suggestion(db: Session, user_id: int, suggestion_hash: str) -> bool:
        """Dismiss a suggestion so it won't appear again.

        Returns True if dismissed, False if already dismissed.
        """
        # Check if already dismissed
        existing = db.query(DismissedSuggestion).filter(
            DismissedSuggestion.user_id == user_id,
            DismissedSuggestion.suggestion_hash == suggestion_hash,
        ).first()

        if existing:
            return False

        dismissed = DismissedSuggestion(
            user_id=user_id,
            suggestion_hash=suggestion_hash,
        )
        db.add(dismissed)
        db.commit()
        return True

    @staticmethod
    def auto_dismiss_on_create(
        db: Session,
        user_id: int,
        description: str,
        amount: int,
        frequency: str
    ) -> None:
        """Auto-dismiss matching suggestion when user creates a recurring.

        Call this after creating a new recurring transaction.
        """
        suggestion_hash = RecurringSuggestionService._generate_hash(
            description, amount, frequency
        )
        RecurringSuggestionService.dismiss_suggestion(db, user_id, suggestion_hash)
