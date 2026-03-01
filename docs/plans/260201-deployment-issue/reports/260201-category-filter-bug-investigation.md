# Category Filtering Bug Investigation Report

**Date:** 2026-02-01
**Issue:** Category filtering not working on transactions page
**URL:** https://money.khanh.page/transactions?categories=Insurance+%26+Medical&month=2026-02&fromAccounts=false

## Root Cause

**Category hierarchy mismatch between frontend filter and backend database structure.**

### The Problem

1. **User expectation:** Filter by "Insurance & Medical" category
2. **URL parameter:** `categories=Insurance+%26+Medical` (single string: "Insurance & Medical")
3. **Database reality:** No category named "Insurance & Medical" exists

### Database Category Structure

```
Parent Categories (parent_id IS NULL):
- Health (ID: 6)
- Food (ID: 1)
- Housing (ID: 2)
- Transportation (ID: 3)
- Entertainment (ID: 4)
- Shopping (ID: 5)
- Communication (ID: 7)
- Other (ID: 8)
- Income (ID: 44)

Child Categories under Health (parent_id = 6):
- Insurance (ID: 35)
- Medical (ID: 32)
```

**Key finding:** "Insurance" and "Medical" are SEPARATE child categories under "Health" parent.

### Actual Transaction Categories

All transactions use these categories (child category names):
- Communication
- Food
- Housing
- Income
- Other
- Utilities

**No transactions with "Insurance" or "Medical" category exist in database.**

### Code Analysis

#### Frontend (transaction-service.ts:62)
```typescript
if (filters?.categories?.length) {
  params.append('categories', filters.categories.join(','))
}
```
Sends: `categories=Insurance & Medical`

#### Backend Route (transactions.py:69-70)
```python
if categories:
    category_list = [c.strip() for c in categories.split(',') if c.strip()]
```
Parses: `['Insurance & Medical']` (single item)

#### Backend Service (transaction_service.py:118)
```python
if categories:
    query = query.filter(Transaction.category.in_(categories))
```
Filters: `WHERE category IN ('Insurance & Medical')`

**Result:** No matches because no transaction has category="Insurance & Medical"

## The Bug

Backend filtering logic does NOT expand parent categories to include child categories.

When user selects "Health" or types "Insurance & Medical":
- Backend should match: Insurance, Medical, and any other Health children
- Backend currently matches: exact string "Insurance & Medical" only

## Expected Behavior

When filtering by parent category name OR combined child names:
1. Resolve to actual child category names in DB
2. Include ALL children under that parent
3. Filter transactions by child category names

Example:
- User selects: "Health" → Backend filters: `category IN ('Insurance', 'Medical', ...)`
- User selects: "Insurance, Medical" → Backend filters: `category IN ('Insurance', 'Medical')`

## Current State

No transactions visible because:
1. Feb 2026 has no data (most recent: Nov 2025)
2. Filter "Insurance & Medical" matches zero transactions
3. Wrong categories shown (Tire/Car Items, Daiso/Utilities) suggests frontend displaying CACHED data or filtering client-side incorrectly

## Fix Required

**Backend:** Add category expansion in `transaction_service.py`:

```python
# Before filtering, expand parent categories to children
if categories:
    expanded = []
    for cat_name in categories:
        # Check if parent category
        parent = db.query(Category).filter(
            Category.name == cat_name,
            Category.parent_id.is_(None)
        ).first()

        if parent:
            # Add all children
            children = db.query(Category).filter(
                Category.parent_id == parent.id
            ).all()
            expanded.extend([c.name for c in children])
        else:
            # Keep as-is (child category)
            expanded.append(cat_name)

    query = query.filter(Transaction.category.in_(expanded))
```

**OR simpler:** Frontend should send child category names only, never parent names.

## Additional Issues

1. **Data mismatch:** URL says Feb 2026, but no transactions exist for that month
2. **Cache problem:** If wrong transactions shown, frontend may be displaying stale data
3. **Category naming:** "Insurance & Medical" as filter string is ambiguous - should be ["Insurance", "Medical"] array

## Unresolved Questions

1. Where does "Insurance & Medical" string come from in UI? MultiSelect should send array.
2. Why does URL show Feb 2026 when data only exists through Nov 2025?
3. Are wrong transactions (Tire, Daiso, etc.) from client-side cache or different filter path?
4. Should backend support parent category filtering or only child categories?
