# Monthly Report Service Test Failure Analysis

**Report Date:** 2026-02-08
**Test File:** `/home/godstorm91/project/smartmoney/backend/tests/test_monthly_report_service.py`
**Status:** ALL TESTS FAILED AT SETUP
**Severity:** CRITICAL - Blocking Issue

---

## Executive Summary

All 14 tests in monthly report service failed at setup phase due to SQLAlchemy/SQLite incompatibility with JSONB column type in `anomaly_config` table. Zero tests executed. This is infrastructure issue, not test logic issue.

---

## Test Results Overview

- **Total Tests:** 14
- **Passed:** 0
- **Failed:** 14 (all at setup/ERROR stage)
- **Skipped:** 0
- **Execution Time:** 4.49s

---

## Failed Tests

All tests failed with identical error during database setup:

### Test Classes Affected:
1. **TestGenerateReport** (5 tests)
   - `test_report_with_transactions`
   - `test_report_empty_month`
   - `test_report_category_breakdown`
   - `test_report_mom_changes`
   - `test_multi_user_isolation`

2. **TestBudgetAdherence** (2 tests)
   - `test_report_with_budget`
   - `test_report_without_budget`

3. **TestGoalProgress** (2 tests)
   - `test_report_with_goals`
   - `test_report_without_goals`

4. **TestAccountSummary** (2 tests)
   - `test_report_with_accounts`
   - `test_inactive_accounts_excluded`

5. **TestSavingsRate** (3 tests)
   - `test_positive_savings`
   - `test_zero_income`
   - `test_negative_savings`

---

## Root Cause Analysis

### Primary Issue: JSONB Type Incompatibility with SQLite

**Error Message:**
```
sqlalchemy.exc.CompileError: (in table 'anomaly_config', column 'notification_channels'):
Compiler <sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler object> can't render element of type JSONB
```

**Full Stack Trace:**
```
AttributeError: 'SQLiteTypeCompiler' object has no attribute 'visit_JSONB'.
Did you mean: 'visit_JSON'?
```

### Technical Details

1. **Problem Location:**
   - File: `/home/godstorm91/project/smartmoney/backend/app/models/anomaly.py`
   - Lines: 87, 88-92
   - Columns: `notification_channels`, `enabled_types`

2. **Current Code:**
```python
from sqlalchemy.dialects.postgresql import JSONB

class AnomalyConfig(Base):
    __tablename__ = "anomaly_config"

    notification_channels: Mapped[list[str] | None] = mapped_column(
        JSONB, default=["in-app"]
    )
    enabled_types: Mapped[list[str] | None] = mapped_column(
        JSONB,
        default=["large_transaction", "category_shift", "duplicate"],
    )
```

3. **Why It Fails:**
   - `JSONB` is PostgreSQL-specific type
   - SQLite uses `JSON` type (not JSONB)
   - Test fixture uses in-memory SQLite: `sqlite:///:memory:`
   - SQLalchemy cannot compile JSONB for SQLite dialect
   - Table creation fails before any test code runs

4. **Scope of Impact:**
   - Issue affects ALL tests using `Base.metadata.create_all()`
   - Confirmed same error in `tests/test_models.py` (11 tests also fail)
   - Any test creating in-memory database will fail
   - Production uses PostgreSQL - no issue there

---

## Other Affected Models

Same JSONB usage found in:

1. **`app/models/anomaly.py`**
   - `AnomalyAlert.data` (line 50)
   - `AnomalyConfig.notification_channels` (line 87)
   - `AnomalyConfig.enabled_types` (line 88-92)

2. **`app/models/notification.py`**
   - Multiple JSONB columns (line 17 import)

3. **`app/models/insight.py`**
   - Multiple JSONB columns (line 17 import)

---

## Suggested Fixes

### Option 1: Type Adapter (Recommended)
Use SQLAlchemy's type adapter to handle both PostgreSQL and SQLite:

**File:** `/home/godstorm91/project/smartmoney/backend/app/models/anomaly.py`

```python
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator

# Create adapter that uses JSONB for PostgreSQL, JSON for others
class JSONBCompat(TypeDecorator):
    """Platform-independent JSONB type."""
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())

# Then use JSONBCompat instead of JSONB:
notification_channels: Mapped[list[str] | None] = mapped_column(
    JSONBCompat, default=["in-app"]
)
```

### Option 2: Conditional Import
```python
try:
    from sqlalchemy.dialects.postgresql import JSONB as JSONType
except ImportError:
    from sqlalchemy import JSON as JSONType
```

### Option 3: Use Generic JSON Type
Replace all `JSONB` imports with `JSON` from `sqlalchemy`:
```python
from sqlalchemy import JSON
```

**Tradeoff:** Lose PostgreSQL-specific JSONB performance benefits in production.

---

## Files Requiring Changes

1. `/home/godstorm91/project/smartmoney/backend/app/models/anomaly.py`
2. `/home/godstorm91/project/smartmoney/backend/app/models/notification.py`
3. `/home/godstorm91/project/smartmoney/backend/app/models/insight.py`

**Action Required:** Apply fix to ALL three files for consistency.

---

## Additional Warnings

Non-blocking Pydantic deprecation warnings found:

**File:** `/home/godstorm91/project/smartmoney/backend/app/schemas/budget_alert.py`
**Lines:** 23, 70

```
PydanticDeprecatedSince20: Support for class-based `config` is deprecated,
use ConfigDict instead.
```

**Impact:** Low priority - warnings only, not blocking tests.

---

## Verification Steps After Fix

1. Apply type adapter to all JSONB columns
2. Run monthly report tests:
   ```bash
   pytest tests/test_monthly_report_service.py -v
   ```
3. Run model tests to confirm broader fix:
   ```bash
   pytest tests/test_models.py -v
   ```
4. Run full test suite:
   ```bash
   pytest tests/ -v
   ```
5. Verify production PostgreSQL still works (JSONB should be used there)

---

## Test Coverage Assessment

**Cannot assess** until blocking setup issue resolved.

Based on test file structure (14 tests across 5 test classes), expected coverage:
- Report generation with/without data
- Category breakdown calculations
- Month-over-month comparisons
- Multi-user data isolation
- Budget adherence tracking
- Goal progress tracking
- Account summary aggregation
- Savings rate calculations

All test logic appears comprehensive once infrastructure issue fixed.

---

## Critical Blocker Status

**BLOCKER:** Cannot proceed with test validation until JSONB compatibility resolved.

**Recommended Priority:** P0 - Fix immediately before any test validation work.

**Estimated Fix Time:** 30 minutes to implement type adapter + test all affected models.

---

## Unresolved Questions

1. Are there other models with JSONB that weren't checked?
2. Should we create base utility class for JSON compatibility across all models?
3. Do integration tests use real PostgreSQL or also affected by this?
4. Is there CI/CD pipeline that caught this, or tests not running in CI?

---

**Report Generated By:** QA Engineer Agent
**Report Format:** Markdown
**Destination:** Team Review
