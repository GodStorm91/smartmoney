# Currency Exchange Feature Implementation Plan

**Created:** 2026-01-27
**Status:** CODE REVIEW COMPLETE - FIXES REQUIRED
**Complexity:** Medium (~3 story points)
**Review Date:** 2026-01-27
**Review Report:** `./reports/260127-from-code-reviewer-to-developer-currency-exchange-review.md`

---

## Overview

Enable tracking of currency exchange transactions with bidirectional linking and exchange rate storage. Supports use case: VND income -> VND->JPY exchange -> linked transaction chain.

## Research References

- [Linked Transaction Patterns](./research/researcher-01-linked-transactions.md)
- [Existing Codebase Analysis](./research/researcher-02-existing-codebase.md)

## Phases

| Phase | Name | Status | Est. Effort |
|-------|------|--------|-------------|
| 1 | [Database Migration](./phase-01-database-migration.md) | ✅ COMPLETE | 1h |
| 2 | [Backend API](./phase-02-backend-api.md) | ⚠️ NEEDS FIXES | 2h |
| 3 | [Frontend UI](./phase-03-frontend-ui.md) | ✅ COMPLETE | 2h |

**Total Estimated:** 5 hours

## Key Changes Summary

### Database
- `linked_transaction_id` (FK, self-referential) on Transaction
- `exchange_rate` (Decimal 18,8) on Transaction

### Backend
- `POST /api/transfers/exchange` - creates linked exchange pair
- Bidirectional linking: out.linked_transaction_id -> in.id and vice versa
- Optional 3-way link to existing income transaction

### Frontend
- New `CurrencyExchangeForm` component (extension of existing transfer form)
- Exchange rate display + auto-calculation
- Optional income transaction linking dropdown

## Architecture Decisions

1. **Self-referential FK over separate table** - KISS principle, ~2 exchanges/month
2. **Store rate on both transactions** - avoid JOINs for display
3. **Extend existing transfer endpoint pattern** - consistent API design
4. **Reuse existing TransferFormModal pattern** - minimal UI code

## Success Criteria

- [x] Migration creates columns without data loss
- [x] Exchange creates 2 linked transactions with correct amounts/currencies
- [x] Exchange rate stored on both transactions
- [x] Optional income linking works (3-way chain)
- [x] UI displays exchange rate properly
- [x] All existing transfers continue working
- [ ] **BLOCKER:** Fix division by zero risk (line 244)
- [ ] **BLOCKER:** Add circular link validation (line 306-308)
- [ ] **BLOCKER:** Add UUID validation in delete endpoint

## Risks

| Risk | Mitigation |
|------|------------|
| Migration rollback complexity | Test on dev DB first, backup prod before migration |
| Circular FK reference issues | Use nullable FK, set after both records exist |

---

## Implementation Notes

- Follow relative imports per code standards
- Use Decimal for exchange_rate (not float)
- Keep BigInteger for amounts (cents/smallest unit)

---

## Code Review Summary (2026-01-27)

**Overall:** Implementation solid, follows patterns, clean architecture.
**Status:** 3 critical/high issues must be fixed before deployment.

### Must Fix Before Deployment:
1. Division by zero in rate calculation (`transfers.py:244`)
2. Circular link validation for income linking (`transfers.py:306-308`)
3. UUID validation in delete endpoint (`transfers.py:135`)

### Should Fix Before Production:
4. Exchange rate bounds validation (prevent absurd rates)
5. Change Pydantic schema to use Decimal (not float)
6. Add explicit transaction wrapper with try/except
7. Write unit tests for exchange endpoint

**Full Report:** `./reports/260127-from-code-reviewer-to-developer-currency-exchange-review.md`
