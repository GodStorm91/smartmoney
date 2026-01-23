# Spending Forecast "Spent" Amount Calculation Analysis

## Summary
The "Spent" amount displayed on the Budget page's "Spending Forecast" component is calculated by summing all non-income, non-transfer, non-adjustment transactions for the current month, **WITHOUT any currency conversion logic or multi-currency handling**.

## Data Flow

### 1. Frontend Component: BudgetProjectionCard
**Location**: `/frontend/src/components/budget/budget-projection-card.tsx`

The component displays three key metrics:
- **Spent**: Displays `totalSpent` prop
- **Daily Rate**: Calculated as `totalSpent / daysElapsed`
- **Projected**: Calculated as `totalSpent + (rate * remaining days)`

```typescript
// From budget-projection-card.tsx (lines 34-59)
const { daysRemaining, dailyRate, projectedTotal, projectedPercent, status } = useMemo(() => {
  const [year, monthNum] = month.split('-').map(Number)
  const totalDays = new Date(year, monthNum, 0).getDate()
  const today = new Date()
  const currentDay = today.getDate()
  const daysElapsed = Math.max(1, currentDay)
  const remaining = Math.max(0, totalDays - currentDay)

  const rate = totalSpent / daysElapsed
  const projected = totalSpent + (rate * remaining)
  const percent = totalBudget > 0 ? (projected / totalBudget) * 100 : 0
  // ...
})
```

### 2. Frontend Data Provider: BudgetPage
**Location**: `/frontend/src/pages/Budget.tsx` (lines 143-157)

Fetches tracking data via React Query:
```typescript
const { data: tracking } = useQuery({
  queryKey: ['budget', 'tracking', selectedMonth],
  queryFn: async () => {
    try {
      return await getBudgetTracking()
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null
      }
      throw err
    }
  },
  retry: false,
  enabled: !!savedBudget,
})
```

Then passes `tracking?.total_spent` to BudgetProjectionCard (line 365):
```typescript
const spentSoFar = tracking?.total_spent || 0
// ...
<BudgetProjectionCard
  totalBudget={totalBudget}
  totalSpent={spentSoFar}
  month={selectedMonth}
/>
```

### 3. Frontend Service: getBudgetTracking()
**Location**: `/frontend/src/services/budget-service.ts` (lines 52-55)

```typescript
export async function getBudgetTracking(): Promise<BudgetTracking> {
  const response = await apiClient.get<BudgetTracking>('/api/budgets/tracking/current')
  return response.data
}
```

### 4. Backend API Endpoint
**Location**: `/backend/app/routes/budgets.py` (lines 304-329)

```python
@router.get("/tracking/current", response_model=BudgetTrackingResponse)
def get_current_budget_tracking(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get current month's budget tracking with spending data."""
    tracking = BudgetTrackingService.get_budget_tracking(db, current_user.id)
    if not tracking:
        raise HTTPException(...)
    return tracking
```

### 5. Backend Service: BudgetTrackingService (KEY LOGIC)
**Location**: `/backend/app/services/budget_tracking_service.py` (lines 15-114)

#### Calculation Logic (Lines 43-96):
```python
# Get current month budget
current_month = date.today().strftime("%Y-%m")
budget = db.query(Budget).filter(
    Budget.user_id == user_id,
    Budget.month == current_month
).first()

# Get current month start/end dates
year, month = map(int, current_month.split('-'))
month_start = date(year, month, 1)
if month == 12:
    month_end = date(year + 1, 1, 1) - timedelta(days=1)
else:
    month_end = date(year, month + 1, 1) - timedelta(days=1)

# Calculate spending per category for current month
category_spending = {}
spending_data = (
    db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total")
    )
    .filter(
        Transaction.user_id == user_id,
        Transaction.is_income == False,           # ← Excludes income
        Transaction.is_transfer == False,         # ← Excludes transfers
        Transaction.is_adjustment == False,       # ← Excludes adjustments
        Transaction.date >= month_start,          # ← Current month only
        Transaction.date <= month_end             # ← Current month only
    )
    .group_by(Transaction.category)
    .all()
)

for row in spending_data:
    category_spending[row.category] = abs(row.total)

# Build tracking items
total_spent = 0
for allocation in budget.allocations:
    spent = category_spending.get(allocation.category, 0)
    total_spent += spent
```

## Key Findings

### 1. Transaction Filters Applied
The "Spent" amount **ONLY** includes transactions where:
- `is_income = False` (excludes income transactions)
- `is_transfer = False` (excludes inter-account transfers)
- `is_adjustment = False` (excludes manual adjustments)
- `date >= month_start AND date <= month_end` (current month only)
- Grouped by category matching budget allocations

### 2. NO Currency Conversion Applied
**CRITICAL ISSUE**: The calculation uses `func.sum(Transaction.amount)` with NO currency conversion logic.

The Transaction model has a `currency` field (added via migration `20260101_1301_add_currency_to_transactions.py`):
```python
# Migration: backend/alembic/versions/20260101_1301_add_currency_to_transactions.py
op.add_column('transactions', sa.Column('currency', sa.String(length=3), nullable=False, server_default='JPY'))
```

However, the Transaction SQLAlchemy ORM model does NOT have the currency field defined:
```python
# backend/app/models/transaction.py (lines 33-56)
class Transaction(Base):
    __tablename__ = "transactions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # ... other fields ...
    # NOTE: No 'currency' field defined!
```

### 3. Multi-Currency Account Issue
The database has:
- Account model with `currency: Mapped[str]` field (default: "JPY")
- Transaction table with `currency` column in database
- But Transaction ORM model missing the currency field

When summing transactions from multi-currency accounts (VND, USD, etc.), the amounts are summed without conversion:
- ¥12,529 + USD 100 = ¥12,629 (WRONG - mixes currencies)
- Should be: ¥12,529 + (USD 100 × exchange_rate) = ¥12,529 + ~JPY 6,700 = ¥19,229 (example)

## Problem Scenario: Why ¥12,529 Might Be Incorrect for January 2026

If the user has transactions in multiple currencies:
1. Vietnamese Dong account with ¥5,000 spent
2. Japanese Yen account with ¥7,529 spent
3. USD account with USD 50 spent

**Current (BROKEN) Calculation**:
- Sums: 5000 + 7529 + 50 = ¥12,579 (treats USD 50 as ¥50)
- User sees: ¥12,529 ❌

**Expected Calculation**:
- Should convert USD 50 to JPY (e.g., ¥3,350 at 67 JPY/USD)
- Total: 5000 + 7529 + 3350 = ¥15,879 ✓

## Root Cause: Missing Currency Support in Backend

### Missing ORM Field
The `currency` field exists in the database but NOT in the SQLAlchemy model:
```python
# MISSING - should be added to Transaction class
currency: Mapped[str] = mapped_column(String(3), nullable=False, default="JPY")
```

### Missing Conversion Logic
The `BudgetTrackingService.get_budget_tracking()` method needs to:
1. Fetch exchange rates from `ExchangeRate` table
2. Convert non-JPY amounts to JPY before summing
3. Handle null currency (default to 'JPY')

## Recommendations

### Immediate Fix (Short-term)
1. Add missing `currency` field to Transaction ORM model
2. Add currency conversion logic in `BudgetTrackingService.get_budget_tracking()`
3. Fetch user's base currency from settings
4. Query ExchangeRate table for conversion rates
5. Normalize all amounts to base currency before summing

### Code Changes Needed

**File 1: backend/app/models/transaction.py**
```python
# Add after line 56:
currency: Mapped[str] = mapped_column(String(3), nullable=False, default="JPY")
```

**File 2: backend/app/services/budget_tracking_service.py**
```python
# In get_budget_tracking() method, before summing:
# 1. Get user's base currency from settings
# 2. Get exchange rates
# 3. Convert each transaction amount if currency != base_currency
# 4. Then sum converted amounts
```

## Data Structure

### Transaction (Database)
```
id | date | description | amount | category | currency | is_income | is_transfer | is_adjustment
```

### Account (Database)
```
id | name | type | currency | user_id
```

### Budget Tracking Response
```json
{
  "month": "2026-01",
  "monthly_income": 400000,
  "total_spent": 12529,  // ← THIS IS WRONG if multi-currency
  "total_budgeted": 350000,
  "days_remaining": 20,
  "categories": [
    {
      "category": "Food",
      "spent": 5000,
      "budgeted": 10000,
      "percentage": 50.0,
      "status": "green"
    }
  ]
}
```

## Verification Steps

To confirm this is the issue:
1. Check if user has multiple accounts with different currencies
2. Run: `SELECT DISTINCT currency FROM transactions WHERE user_id = ? AND date >= '2026-01-01' AND date <= '2026-01-31'`
3. Check if any non-JPY transactions exist
4. Calculate manual total with exchange conversion vs. what app shows
