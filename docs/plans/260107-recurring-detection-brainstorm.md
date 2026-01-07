# Recurring Pattern Detection - Brainstorm Summary

**Created:** 2026-01-07
**Status:** In Progress
**Category:** Quick Win - Data Entry Friction Reduction

---

## Problem Statement

Users manually set up recurring transactions. The system should automatically detect patterns from transaction history and suggest them for one-click setup.

---

## Agreed Solution

- **Display location:** Recurring page banner
- **Minimum occurrences:** 3 transactions
- **Auto-dismiss:** Yes, when user creates the recurring

---

## Detection Algorithm

```python
def detect_recurring_patterns(transactions, min_occurrences=3):
    # 1. Group by normalized description
    groups = group_by_normalized_description(transactions)

    # 2. For each group with 3+ transactions:
    suggestions = []
    for description, txns in groups.items():
        if len(txns) < min_occurrences:
            continue

        # Sort by date
        txns = sorted(txns, key=lambda t: t.date)

        # Calculate intervals between consecutive transactions
        intervals = [
            (txns[i+1].date - txns[i].date).days
            for i in range(len(txns)-1)
        ]

        # Detect frequency pattern
        avg_interval = sum(intervals) / len(intervals)
        interval_variance = variance(intervals)

        # Check for monthly (~30 days ±7)
        if 23 <= avg_interval <= 37 and interval_variance < 50:
            frequency = "monthly"
        # Check for weekly (~7 days ±2)
        elif 5 <= avg_interval <= 9 and interval_variance < 5:
            frequency = "weekly"
        else:
            continue  # Not a clear pattern

        # Calculate average amount (within 10% tolerance)
        amounts = [abs(t.amount) for t in txns]
        avg_amount = sum(amounts) / len(amounts)
        amount_variance = max(amounts) - min(amounts)
        if amount_variance / avg_amount > 0.1:
            continue  # Amounts too different

        # Calculate confidence score
        confidence = calculate_confidence(len(txns), interval_variance, amount_variance)

        suggestions.append({
            "description": most_common_description(txns),
            "amount": round(avg_amount),
            "frequency": frequency,
            "category": most_common_category(txns),
            "confidence": confidence,
            "occurrences": len(txns),
            "last_date": txns[-1].date,
        })

    return sorted(suggestions, key=lambda s: -s["confidence"])
```

---

## Technical Specification

### Backend

#### New Model: DismissedSuggestion
```python
class DismissedSuggestion(Base):
    __tablename__ = "dismissed_suggestions"

    id: int (PK)
    user_id: int (FK)
    suggestion_hash: str  # Hash of description+amount+frequency
    dismissed_at: datetime
```

#### New Service: RecurringSuggestionService
```python
class RecurringSuggestionService:
    @staticmethod
    def detect_patterns(db, user_id, min_occurrences=3) -> list[dict]

    @staticmethod
    def dismiss_suggestion(db, user_id, suggestion_hash: str) -> bool

    @staticmethod
    def is_dismissed(db, user_id, suggestion_hash: str) -> bool
```

#### New Endpoints
```
GET  /api/recurring/suggestions
POST /api/recurring/suggestions/{hash}/dismiss
```

### Frontend

#### New Component: RecurringSuggestionsCard
- Fetches suggestions from API
- Shows dismissible cards for each suggestion
- "Add as Recurring" button opens pre-filled form
- "Dismiss" button hides the suggestion

---

## File Changes

### New Files
- `backend/app/models/dismissed_suggestion.py`
- `backend/app/services/recurring_suggestion_service.py`
- `frontend/src/components/recurring/RecurringSuggestionsCard.tsx`

### Modified Files
- `backend/app/routes/recurring.py` - Add suggestion endpoints
- `backend/app/schemas/recurring.py` - Add suggestion schemas
- `frontend/src/pages/Recurring.tsx` - Add suggestions banner
- `frontend/src/services/recurring-service.ts` - Add suggestion API calls
- `frontend/public/locales/*/common.json` - Add translations

---

## Success Criteria

- [ ] Detects monthly patterns (25-35 day intervals)
- [ ] Detects weekly patterns (5-9 day intervals)
- [ ] Shows suggestions on Recurring page
- [ ] One-click to add as recurring (pre-fills form)
- [ ] Dismiss persists (doesn't show again)
- [ ] Auto-dismiss when recurring created with same description
- [ ] i18n support (EN, JA, VI)

---

**END OF BRAINSTORM**
