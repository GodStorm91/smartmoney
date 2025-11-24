# Budget Page State Flow

## Before Fix (BROKEN)

```
User visits /budget
       ↓
API: GET /api/budgets/current
       ↓
   ┌───────────────────┐
   │  HTTP Response    │
   └───────────────────┘
           │
      ┌────┴────┐
      │         │
   404 ❌      200 ✓
      │         │
   error =   budget =
   truthy    Budget
      │         │
   budget =  error =
   undefined undefined
      │         │
      └────┬────┘
           │
    Evaluate Conditions
           │
      ┌────┴────┐
      │         │
!budget &&  budget
  !error      exists
      │         │
   FALSE!    TRUE
   (error    Shows
    set)     budget
      │
  ❌ BROKEN
  Shows error
  card instead
  of form
```

**Problem:** 404 triggers error state, `!error` becomes `false`, form never renders.

## After Fix (WORKING)

```
User visits /budget
       ↓
API: GET /api/budgets/current
       ↓
   ┌───────────────────┐
   │  HTTP Response    │
   └───────────────────┘
           │
      ┌────┴─────┐
      │          │
   404 ✓      200 ✓
      │          │
 Catch in    Return
 queryFn     Budget
      │          │
  Return    budget =
   null     Budget
      │          │
budget =   error =
  null     undefined
      │          │
error =       │
undefined     │
      │       │
      └───┬───┘
          │
   Evaluate Conditions
          │
     ┌────┴─────┐
     │          │
!budget &&   budget
  !error      exists
     │          │
   TRUE!      TRUE
     │          │
✅ WORKING  Shows
 Shows form  budget
```

**Solution:** 404 caught in queryFn, returns `null` (empty state), form renders correctly.

## State Matrix

| API Response | budget    | error     | UI Rendered          | Status |
|-------------|-----------|-----------|---------------------|--------|
| 404         | `null`    | `undefined` | ✅ BudgetGenerateForm | Fixed  |
| 200         | `Budget`  | `undefined` | ✅ Budget Details     | Works  |
| 500         | `undefined` | `Error`   | ✅ Error Card (red)   | Works  |
| Network err | `undefined` | `Error`   | ✅ Error Card (red)   | Works  |
| Loading     | `undefined` | `undefined` | ✅ LoadingSpinner   | Works  |

## Code Comparison

### BEFORE (Broken)
```typescript
❌ queryFn: getCurrentBudget
   // 404 → React Query error state
   // error = truthy
   // Condition !budget && !error = FALSE
   // Form hidden ❌
```

### AFTER (Fixed)
```typescript
✅ queryFn: async () => {
     try {
       return await getCurrentBudget()
     } catch (err: any) {
       if (err?.response?.status === 404) {
         return null  // Empty state, not error
       }
       throw err
     }
   }
   // 404 → budget = null, error = undefined
   // Condition !budget && !error = TRUE
   // Form visible ✅
```

## User Journey

### Before Fix
```
User → /budget
  ↓
❌ Sees: "No budget found. Generate one to get started!"
  ↓
😕 Confused: Where is the form?
  ↓
💔 Cannot create budget
```

### After Fix
```
User → /budget
  ↓
✅ Sees: "Generate Your Budget" form
  ↓
📝 Enters monthly income
  ↓
🎯 Clicks "Generate Budget"
  ↓
🎉 Budget created successfully!
```

## Rendering Logic

```typescript
// Loading State
if (isLoading) {
  return <LoadingSpinner />
}

// Empty State (404) - Show Form
{!budget && !error && (
  <BudgetGenerateForm />  // ✅ Now renders correctly
)}

// Budget Exists - Show Details
{budget && (
  <BudgetSummaryCard />
  <BudgetAllocationList />
)}

// Error State (500, network) - Show Error
{error && (
  <Card className="border-red-200 bg-red-50">
    <p className="text-red-600">{error.message}</p>
  </Card>
)}
```

## Key Insight

**Empty State ≠ Error State**

- **Empty State (404):** Normal state when user hasn't created resource yet
  - Should invite action (show creation form)
  - Use neutral colors (gray)

- **Error State (5xx, network):** Unexpected failure
  - Should explain what went wrong
  - Use error colors (red)
  - Provide retry or recovery options

This pattern applies to any user-generated resource:
- Goals, Budgets, Transactions, Accounts, etc.
- Always check: "Is 404 expected or error?"
- Handle accordingly in queryFn
