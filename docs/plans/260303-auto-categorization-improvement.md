# Auto-Categorization Improvement Plan

**Date:** 2026-03-03
**Status:** Brainstorm Complete — Ready for Implementation Planning

## Problem Statement

Current auto-categorization is passive — suggests categories in a dropdown but never auto-fills. CSV import uses a static mapping dict and ignores learned rules. No learning loop exists: user corrections don't feed back into the system. Result: high manual effort, high "Other" rate.

## Current State

| Flow | Method | Gap |
|---|---|---|
| Manual input | History lookup → keyword rule fallback in dropdown | Requires click; no auto-fill |
| CSV upload | Static `CATEGORY_MAPPING` dict | Ignores rules; maps to parent only |
| Batch AI | Claude Haiku on "Other" txns (credits-gated) | After-the-fact; not inline |
| User correction | Manual pick from HierarchicalCategoryPicker | No learning; correction is lost |

## Solution: 3-Layer Confidence Cascade

```
Layer 1: History Match     → confidence = count_top / count_total (0.0-1.0)
Layer 2: Keyword Rule      → confidence = 0.8 (seeded) / 0.7 (learned)
Layer 3: AI Micro-Categorize → confidence from Claude Haiku response
─────────────────────────────────────────────────────────────
Auto-fill threshold: confidence >= 0.7
```

### Layer 1: Enhanced Suggestions with Auto-Category

**Backend:** Modify `GET /api/transactions/suggestions` response to include:
```json
{
  "suggestions": [...existing...],
  "auto_category": {
    "category": "Cafe",
    "parent_category": "Food",
    "is_income": false,
    "confidence": 0.95,
    "source": "history"
  }
}
```

Confidence = `count_of_dominant_category / total_matches`. If "Starbucks" → "Cafe" 9/10 times, confidence=0.9.

**Frontend:** When `auto_category.confidence >= 0.7`:
- Auto-fill category + parentCategory silently
- Show muted badge: "Auto-suggested • Cafe"
- User can override by tapping HierarchicalCategoryPicker

### Layer 2: Learn-on-Save Rules

**Backend:** After `POST /api/transactions` and `PUT /{id}`:
1. If `category not in ('Other', 'Transfer')` and not `is_adjustment`
2. Extract keyword: first word of description >= 3 chars
3. If no existing rule for `(user_id, keyword)`: create `CategoryRule(keyword, category, match_type="contains", priority=3)`
4. If rule exists with different category: skip (don't overwrite)

**Constraints:** Max 200 learned rules per user. Priority=3 (below seeded=10, below user-created=5).

**CSV Enhancement:** In `csv_row_parser.py`, after `map_category()` returns "Other":
- Call `CategoryRuleService.categorize(description, user_rules)`
- Use rule result if found

### Layer 3: AI Micro-Categorize (Fallback)

**New endpoint:** `GET /api/ai/categorize/inline?description=...`

**Trigger (frontend):** 1s after last keystroke, if:
- Description >= 5 chars
- No `auto_category` from suggestions
- User hasn't manually picked a category

**Backend:**
- Check credit balance (needs ~0.01 credits)
- Call Claude Haiku with description + category tree
- Cache 5min per description
- Rate limit: 10 calls/min/user

**Cost:** ~$0.005/call → $1.50/month per active user (10 txns/day)

## Data Flow

```
Type "スタバ ラテ"
  → 300ms debounce → GET /suggestions
  → History: 8 matches, all "Cafe" → confidence=1.0
  → Auto-fill: category="Cafe" ✓
  → Save → keyword "スタバ" rule exists → skip

Type "Notion subscription" (first time)
  → 300ms debounce → GET /suggestions → no matches
  → 1000ms idle → GET /ai/categorize/inline
  → AI: {category: "Software", confidence: 0.85}
  → Auto-fill: category="Software" ✓
  → Save → create rule: CategoryRule("Notion", "Software", priority=3)
  → Next time: instant match from rule, no AI call
```

## Files to Modify

| File | Change | Layer |
|---|---|---|
| `backend/app/routes/transactions.py` | Enhance `/suggestions` with `auto_category`; add learn-on-save | 1+2 |
| `backend/app/routes/ai_categorization.py` | Add `GET /inline` endpoint | 3 |
| `backend/app/services/category_rule_service.py` | Add `learn_from_transaction()` method | 2 |
| `backend/app/utils/csv_row_parser.py` | Apply rules for "Other" fallback | 2 |
| `frontend/src/components/transactions/DescriptionAutocomplete.tsx` | Emit auto_category to parent | 1 |
| `frontend/src/components/transactions/TransactionFormModal.tsx` | Accept auto-category, AI fallback timer, badge | 1+3 |
| `frontend/src/services/transaction-service.ts` | Update types, add `fetchInlineCategorization()` | 1+3 |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Auto-fill feels aggressive | Confidence threshold 0.7 + easy override |
| Learned rules pollute | Cap 200/user, priority=3, no overwrites |
| AI costs accumulate | Rate limit + only when no history/rule match |
| Same keyword → different categories | Don't overwrite rules; mixed history lowers confidence |
| AI latency | 1s idle absorbs typing; Haiku ~200ms; loading indicator |

## Success Metrics

- **Auto-fill rate:** >=70% of transactions after 1 month
- **Override rate:** <15% of auto-filled categories changed by user
- **"Other" rate:** <5% of saved transactions
- **Rule growth:** Track learned rules/user/month

## Implementation Order

1. **Layer 1** (1-2 SP): Enhance `/suggestions` + frontend auto-fill — immediate value
2. **Layer 2** (2 SP): Learn-on-save + CSV rule application — compounds over time
3. **Layer 3** (3 SP): AI inline endpoint + frontend timer — catches remaining gaps

Layers are independent and can ship incrementally.
