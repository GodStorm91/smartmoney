# Phase 1: Fix Critical API Bug

**Priority:** Critical | **Effort:** 1-2 hours | **Risk:** Low

---

## Context Links

- Plan Overview: [plan.md](./plan.md)
- Brainstorm: [BRAINSTORM_SUMMARY.md](../260201-budget-category-ux-improvements/BRAINSTORM_SUMMARY.md)
- Backend Routes: `backend/app/routes/transactions.py`
- Transaction Service: `backend/app/services/transaction_service.py`

---

## Overview

Frontend sends `categories` param (comma-separated), backend expects `category` (single).
Result: Backend ignores unknown param, returns ALL transactions unfiltered.

---

## Key Insights

1. Frontend already sends correct format: `categories=Food,Groceries,Dining`
2. Backend route only accepts `category` (singular) param
3. Service layer only filters by exact category match
4. Fix is additive - keep `category` for backward compatibility

---

## Requirements

1. Add `categories` query parameter to GET /api/transactions
2. Support comma-separated category names
3. Filter using SQL IN clause for multiple categories
4. Keep existing `category` param for single-category filtering
5. Update `count_transactions` to match same filtering

---

## Architecture

```
Frontend Request:
  GET /api/transactions?categories=Food,Groceries,Dining

Backend Route (transactions.py):
  categories: Optional[str] = Query(None)  # NEW

Service Layer (transaction_service.py):
  if categories:
    cat_list = [c.strip() for c in categories.split(',')]
    query = query.filter(Transaction.category.in_(cat_list))
```

---

## Related Code Files

### `backend/app/routes/transactions.py` (lines 51-97)

Current signature:
```python
category: Optional[str] = Query(None, description="Filter by category")
```

Add after line 55:
```python
categories: Optional[str] = Query(None, description="Comma-separated category names")
```

### `backend/app/services/transaction_service.py` (lines 80-128)

Current filtering (line 117-118):
```python
if category:
    query = query.filter(Transaction.category == category)
```

Add multi-category support:
```python
if categories:
    cat_list = [c.strip() for c in categories.split(',')]
    query = query.filter(Transaction.category.in_(cat_list))
elif category:
    query = query.filter(Transaction.category == category)
```

---

## Implementation Steps

1. **Update transactions.py route**
   - Add `categories` parameter to `get_transactions` function signature
   - Pass `categories` to service layer

2. **Update transaction_service.py**
   - Add `categories` param to `get_transactions` method signature
   - Add `categories` param to `count_transactions` method signature
   - Implement IN clause filtering when `categories` provided
   - Maintain backward compatibility with `category` param

3. **Write tests**
   - Test single category filter still works
   - Test multiple categories filter works
   - Test empty categories param returns all
   - Test categories takes precedence over category

---

## Todo List

- [ ] Add `categories` param to transactions.py route (line ~55)
- [ ] Pass `categories` to TransactionService.get_transactions call
- [ ] Pass `categories` to TransactionService.count_transactions call
- [ ] Add `categories` param to get_transactions service method
- [ ] Add `categories` param to count_transactions service method
- [ ] Implement IN clause filtering logic
- [ ] Add unit tests for multi-category filtering
- [ ] Test frontend budget detail panel shows correct transactions

---

## Success Criteria

- [ ] GET /api/transactions?categories=Food,Groceries returns only Food/Groceries
- [ ] GET /api/transactions?category=Food still works (backward compat)
- [ ] count_transactions returns correct count for multi-category
- [ ] Budget detail panel shows correct category transactions
- [ ] All existing tests pass
- [ ] New tests for multi-category filtering pass

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing clients | Medium | Keep `category` param working |
| Performance with large IN clause | Low | Categories rarely >10 items |
| SQL injection | Low | ORM handles parameterization |

---

## Security Considerations

- SQLAlchemy IN clause prevents SQL injection via parameterized queries
- Input validation: Split and strip category names
- No sensitive data exposure

---

## Next Steps

After completing this phase:
1. Verify budget detail panel loads correct transactions
2. Proceed to Phase 2: Status Badges
