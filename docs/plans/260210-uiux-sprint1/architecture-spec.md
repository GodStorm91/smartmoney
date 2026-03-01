# Sprint 1 UI/UX Architecture Specification

**Date**: 2026-02-10
**Scope**: Micro-interactions (staggered animations), empty states, form validation patterns

---

## 1. Animation System

### 1.1 Current State Audit

**`index.css`** defines:
- `.animate-slide-up` (slideUp keyframe, 0.2s ease-out, translateY 100%->0 + opacity)
- `.animate-fade-in` (fadeIn keyframe, 0.3s ease-out, opacity 0->1)
- `.animate-bounce-in` (bounceIn keyframe, 0.5s spring curve, scale 0.3->1)
- `.transition-default` (transition-all 200ms ease-out)
- `.card-hover` (hover:shadow-md 200ms)
- `prefers-reduced-motion` media query already exists (sets animation/transition to 0.01ms)

**`tailwind.config.js`** defines:
- `animation.fade-in` (fadeIn 0.3s ease-out)
- `animation.slide-up` (slideUp 0.3s ease-out, translateY 10px->0 + opacity)
- Note: tailwind's `slideUp` uses 10px offset vs CSS's 100% offset -- slight inconsistency

**Existing JS animation**: `CountUp.tsx` uses `requestAnimationFrame` with easeOutQuart for number counting (1000ms default).

**Existing inline animations**: `ResponsiveModal.tsx` uses `animate-fade-in` and `animate-slide-up` on backdrops/sheets; `animate-modal-in` referenced but not defined in CSS (likely from a previous iteration or external dependency).

### 1.2 Staggered Entry Animation Design

#### CSS Custom Property Approach (CSS-only, no JS library needed)

Add a `--stagger-index` CSS custom property set inline on each child element, then use a single CSS animation class that derives its `animation-delay` from the property.

```css
/* index.css - new additions */
@layer utilities {
  /* Staggered fade-slide-up animation */
  .animate-stagger-in {
    opacity: 0;
    animation: staggerFadeSlideUp 0.4s ease-out forwards;
    animation-delay: calc(var(--stagger-index, 0) * 60ms);
  }

  @keyframes staggerFadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

#### Usage Pattern (React)

```tsx
{items.map((item, index) => (
  <div
    key={item.id}
    className="animate-stagger-in"
    style={{ '--stagger-index': index } as React.CSSProperties}
  >
    <ItemCard item={item} />
  </div>
))}
```

No JS animation library. No additional runtime. Pure CSS with inline custom property.

### 1.3 Standard Timing Tokens

| Token | Value | Use Case |
|---|---|---|
| `--duration-fast` | `150ms` | Hover states, toggles, micro-feedback |
| `--duration-normal` | `200ms` | Standard transitions (current default) |
| `--duration-slow` | `400ms` | Stagger entry, page-level transitions |
| `--easing-default` | `ease-out` | General purpose |
| `--easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy feedback (button press, FAB) |
| `--stagger-delay` | `60ms` | Delay increment per child element |

These should be defined as CSS custom properties on `:root` in `index.css` for consistency.

### 1.4 Components That Receive Staggered Entry

| Component/Section | Location | Items | Max stagger |
|---|---|---|---|
| Dashboard KPI Row | `Dashboard.tsx:280` (KpiRow) | 3 grid items | 3 * 60ms = 180ms |
| Dashboard Quick Stats | `Dashboard.tsx:283-298` | 2 cards | 2 * 60ms = 120ms |
| Dashboard Recent Transactions | `Dashboard.tsx:317-347` | 5 list items | 5 * 60ms = 300ms |
| Dashboard Category Chips | `Dashboard.tsx:366-374` | up to 8 chips | 8 * 60ms = 480ms |
| Dashboard Goals | `Dashboard.tsx:393-404` | up to 4 cards | 4 * 60ms = 240ms |
| Transaction Summary Cards | `Transactions.tsx:645-678` | 3 cards | 3 * 60ms = 180ms |
| Transaction List Items | `Transactions.tsx:844-884` | first 10 only | cap at 600ms |
| Goals Progress Cards | `Goals.tsx:197-211` | up to 4 | 4 * 60ms = 240ms |
| Accounts Cards | `Accounts.tsx:249-259` | per group | cap at 6 * 60ms = 360ms |
| Budget Overview Cards | via OverviewTab | varies | cap at 5 * 60ms = 300ms |
| Analytics Hero Metrics | via HeroMetrics | 4 metrics | 4 * 60ms = 240ms |
| Bills List | via BillList | per bill | cap at 8 * 60ms = 480ms |

**Cap rule**: Never stagger more than 10 items. Items beyond index 9 should render with no delay (instant).

### 1.5 Reduced Motion

The existing `prefers-reduced-motion` block in `index.css` (line 135-143) already covers all animations and transitions globally. The new `animate-stagger-in` class will automatically be neutralized by this rule since it uses `animation-duration`. No additional work needed.

### 1.6 Additional Micro-interactions

#### Button Press Feedback
Add `active:scale-[0.97]` class to interactive `Card` components and primary buttons (already partially exists on quick action icons at `Dashboard.tsx:265`).

#### Progress Bar Animated Fill
Progress bars in `SavingsRateCard`, `MiniGoalCard`, and `GoalAchievabilityCard` already use `transition-all`. Ensure they use `transition-all duration-500 ease-out` for a visible fill animation on mount. Currently they transition on re-render but have no entry animation. Add the stagger approach to give them a slight delay so the bar fills after the card appears.

---

## 2. Empty State Strategy

### 2.1 Current State Audit

**`EmptyState.tsx`** component API:
```ts
interface EmptyStateProps {
  icon?: React.ReactNode      // Custom icon (ReactNode), falls back to Sparkles
  title: string               // Required heading
  description?: string        // Optional subtext
  action?: React.ReactNode    // Optional CTA (typically a Button)
  className?: string          // Container override
  compact?: boolean           // Reduces padding/font sizes
}
```

**Current usage** (only 2 places use the component):
1. `Transactions.tsx:934` - Full empty state with icon, title, description, CTA button
2. `ReminderScheduleList.tsx` - Uses `EmptyState` for empty reminder schedules

**Ad-hoc empty states** (not using the component):
- `Dashboard.tsx:349-353` - Inline `<p>` tag for no transactions
- `Accounts.tsx:175-214` - Custom inline empty state with icon, title, description, CTA button
- `Analytics.tsx:207,223,249` - Inline `<div>` with "No data" text inside charts
- `MonthlyReport.tsx:180-183` - Inline empty text
- `CreditTransactions.tsx:122` - Inline `<p>` tag
- `NotificationCenter.tsx:174` - Inline text
- `SavingsRecommendations.tsx:113` - Inline `<p>`
- `InsightCardList.tsx:83` - Inline text
- `AnomalyAlertList.tsx:80` - Inline text
- `Goals.tsx:228` - Uses `GoalCreateEmptyState` (custom, not the shared component)

### 2.2 Enhanced EmptyState Component API

The existing API is solid. Add two optional props:

```ts
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
  // New props:
  illustration?: 'transactions' | 'goals' | 'budget' | 'accounts' | 'analytics' | 'bills' | 'recurring' | 'generic'
  animated?: boolean  // defaults to true, applies animate-stagger-in
}
```

- `illustration` selects a predefined SVG illustration (lightweight inline SVGs, not images). If both `icon` and `illustration` are provided, `icon` takes precedence. Illustrations are optional enhancement; the existing `icon` prop remains the primary mechanism.
- `animated` controls whether the empty state fades in on mount.

### 2.3 Empty State Content Map

Each page/context needs specific content. All text should go through i18n (`t()` function). Below are the i18n keys and default English values.

| Context | Icon (lucide) | i18n Title Key | Default Title | i18n Description Key | Default Description | CTA |
|---|---|---|---|---|---|---|
| **Transactions** (no data) | `Receipt` | `emptyState.transactions.title` | No transactions yet | `emptyState.transactions.description` | Add your first transaction or upload a CSV to get started | Button: "Add Transaction" |
| **Transactions** (filtered, no match) | `Search` | `emptyState.transactionsFiltered.title` | No matching transactions | `emptyState.transactionsFiltered.description` | Try adjusting your filters or date range | Button: "Clear Filters" |
| **Goals** (no goals) | `Target` | `emptyState.goals.title` | Set your first savings goal | `emptyState.goals.description` | Track progress toward your financial targets | Button: "Create Goal" |
| **Budget** (no budget) | `PieChart` | `emptyState.budget.title` | No budget for this month | `emptyState.budget.description` | Generate an AI budget or copy from last month | (handled by existing BudgetGenerateForm) |
| **Accounts** (no accounts) | `Wallet` | `emptyState.accounts.title` | No accounts yet | `emptyState.accounts.description` | Add your bank accounts, wallets, and cards | Button: "Create Account" |
| **Analytics** (no data) | `BarChart3` | `emptyState.analytics.title` | Not enough data | `emptyState.analytics.description` | Add transactions to see spending insights | Link: "Go to Transactions" |
| **Bills** (no bills) | `FileText` | `emptyState.bills.title` | No bills tracked | `emptyState.bills.description` | Add your recurring bills to never miss a payment | Button: "Add Bill" |
| **Recurring** (no recurring) | `RefreshCw` | `emptyState.recurring.title` | No recurring transactions | `emptyState.recurring.description` | Set up automated tracking for regular expenses | Button: "Add Recurring" |
| **Dashboard Recent** (no transactions) | `Receipt` | `emptyState.dashboardRecent.title` | No recent activity | `emptyState.dashboardRecent.description` | Your latest transactions will appear here | Link: "Add Transaction" |
| **Notifications** (empty) | `Bell` | `emptyState.notifications.title` | All caught up | `emptyState.notifications.description` | You'll see alerts and updates here | None |
| **Chart** (no data) | `BarChart3` | `emptyState.chart.title` | No data to display | `emptyState.chart.description` | Add transactions to generate charts | None |

### 2.4 Migration Plan

**Phase 1** (Sprint 1): Replace all ad-hoc inline empty states with the `<EmptyState>` component using appropriate props. This is a direct substitution -- no new logic, just swapping inline JSX for the shared component.

**Pages to update**:
1. `Dashboard.tsx:349-353` - Replace `<p>` with `<EmptyState compact>`
2. `Accounts.tsx:175-214` - Replace custom JSX with `<EmptyState icon={...} action={...}>`
3. `Analytics.tsx:207,223,249` - Replace inline divs with `<EmptyState compact illustration="analytics">`
4. `MonthlyReport.tsx:180-183` - Replace with `<EmptyState compact>`
5. `CreditTransactions.tsx:122` - Replace with `<EmptyState compact>`
6. `NotificationCenter.tsx:174` - Replace with `<EmptyState compact>`
7. `SavingsRecommendations.tsx:113` - Replace with `<EmptyState compact>`
8. `InsightCardList.tsx:83` - Replace with `<EmptyState compact>`
9. `AnomalyAlertList.tsx:80` - Replace with `<EmptyState compact>`

**Phase 2** (future): Add illustrations for a more polished look.

---

## 3. Form Validation Pattern

### 3.1 Current State Audit

**`Input.tsx`** component API:
```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string   // Error message string; also changes border to red
}
```

When `error` is truthy:
- Border changes to `border-red-500`, focus ring to `focus:ring-red-500`
- Error message rendered as `<p className="mt-1.5 text-sm text-red-600">` below input

**Current validation patterns across forms**:

| Form | Validation Approach | Error Display |
|---|---|---|
| `TransactionFormModal.tsx` | Manual `validateForm()` sets `errors` state object. Errors shown as `<p className="mt-1 text-sm text-red-500">` below each field. Uses raw `<input>` elements (not `<Input>` component) for most fields. | Inline per-field |
| `GoalCreateModal.tsx` | Uses `validateGoalForm()` helper, translates error keys. Uses `<Input error={}>` for some fields. | Mixed: Input component + inline |
| `AccountFormModal.tsx` | Manual validation in `validateForm()`. Uses raw `<input>` with conditional `border-red-500`. | Inline per-field |
| `BillForm.tsx` | Uses `errors` state object. Uses `<Input>` component with `error` prop. | Via Input component |
| `TransferFormModal.tsx` | Manual validation. Errors shown inline. | Inline per-field |
| `BudgetGenerateForm` | Minimal validation (income > 0). | Inline |

### 3.2 Enhanced Input Component API

Extend the existing `Input.tsx` with two new optional props:

```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  // New props:
  helperText?: string    // Persistent helper text below input (gray, always visible)
  success?: string       // Success message (green border + green text below)
}
```

**Visual states**:
- **Default**: `border-gray-300` (existing)
- **Focus**: `ring-2 ring-primary-500` (existing)
- **Error**: `border-red-500 ring-red-500` + red error text (existing)
- **Success**: `border-green-500 ring-green-500` + green text + optional checkmark icon
- **Helper**: Gray text below input, does not affect border color

**Priority**: `error` > `success` > `helperText` (only one bottom message shown at a time)

**Implementation**:
```tsx
// Simplified render logic for bottom text:
{error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
{!error && success && <p className="mt-1.5 text-sm text-green-600 dark:text-green-400">{success}</p>}
{!error && !success && helperText && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
```

### 3.3 Validation Error Message Conventions

All validation error messages must be:
1. **i18n keys** - Never hardcoded English. Use `t('form.errors.<field>.<rule>')` pattern.
2. **Specific** - Say what's wrong and what to do. "Amount must be greater than 0" not "Invalid amount".
3. **Consistent format** - Sentence case, no period at end, no exclamation marks.

**Standard i18n key pattern**: `form.errors.<context>.<field>.<rule>`

Examples:
```json
{
  "form": {
    "errors": {
      "transaction": {
        "amount": {
          "required": "Amount is required",
          "positive": "Amount must be greater than 0"
        },
        "description": {
          "required": "Description is required",
          "maxLength": "Description must be under 200 characters"
        },
        "category": {
          "required": "Please select a category"
        },
        "account": {
          "required": "Please select an account"
        }
      },
      "goal": {
        "targetAmount": {
          "required": "Target amount is required",
          "minimum": "Minimum amount is {{amount}}"
        },
        "years": {
          "range": "Years must be between 1 and 10"
        }
      },
      "account": {
        "name": {
          "required": "Account name is required"
        },
        "date": {
          "required": "Balance date is required"
        }
      },
      "bill": {
        "name": {
          "required": "Bill name is required"
        },
        "amount": {
          "required": "Amount is required",
          "positive": "Amount must be greater than 0"
        }
      }
    }
  }
}
```

### 3.4 Forms Requiring Validation Enhancement

| Form | File | Current Issues | Sprint 1 Action |
|---|---|---|---|
| **TransactionFormModal** | `components/transactions/TransactionFormModal.tsx` | Uses raw `<input>` not `<Input>`. Error styling inconsistent. | Migrate amount/description inputs to use `<Input>` component with `error` prop. Standardize error messages to i18n keys. |
| **AccountFormModal** | `components/accounts/AccountFormModal.tsx` | Uses raw `<input>` not `<Input>`. Manual border-red logic. | Migrate to `<Input>` component. Add `helperText` for balance reconciliation hint. |
| **GoalCreateModal** | `components/goals/GoalCreateModal.tsx` | Partially uses `<Input>`. Good validation helper. | Already solid. Add `helperText` to target amount field showing minimum. |
| **BillForm** | `components/bills/BillForm.tsx` | Uses `<Input>` component. Good pattern. | Add `helperText` for due date field. |
| **TransferFormModal** | `components/transfers/TransferFormModal.tsx` | Manual validation. | Migrate to `<Input>` component. |
| **BudgetGenerateForm** | `components/budget/budget-generate-form.tsx` | Minimal validation. | Add income validation with error message. |

### 3.5 Error Animation

When an error appears on a field, apply a subtle shake animation:

```css
@layer utilities {
  .animate-shake {
    animation: shake 0.3s ease-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-2px); }
    80% { transform: translateX(2px); }
  }
}
```

Apply `animate-shake` to the input wrapper `<div>` when `error` transitions from falsy to truthy. This requires a small state check in the `Input` component (track previous error state with `useRef`).

---

## 4. Tailwind Config Changes

### 4.1 New Animation Keyframes

Add to `tailwind.config.js` `theme.extend`:

```js
animation: {
  'fade-in': 'fadeIn 0.3s ease-out',
  'slide-up': 'slideUp 0.3s ease-out',
  // New:
  'stagger-in': 'staggerFadeSlideUp 0.4s ease-out forwards',
  'shake': 'shake 0.3s ease-out',
},
keyframes: {
  fadeIn: { /* existing */ },
  slideUp: { /* existing */ },
  // New:
  staggerFadeSlideUp: {
    '0%': { opacity: '0', transform: 'translateY(12px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%': { transform: 'translateX(-4px)' },
    '40%': { transform: 'translateX(4px)' },
    '60%': { transform: 'translateX(-2px)' },
    '80%': { transform: 'translateX(2px)' },
  },
},
```

---

## 5. File Change Summary

### Files to Modify

| File | Change Type | Description |
|---|---|---|
| `frontend/src/index.css` | Add CSS | Timing tokens (CSS vars), `.animate-stagger-in`, `.animate-shake` |
| `frontend/tailwind.config.js` | Add config | `staggerFadeSlideUp` and `shake` keyframes+animations |
| `frontend/src/components/ui/Input.tsx` | Enhance | Add `helperText`, `success` props, shake animation on error |
| `frontend/src/components/ui/EmptyState.tsx` | Enhance | Add `illustration`, `animated` props |
| `frontend/src/pages/Dashboard.tsx` | Modify | Add stagger classes to KPI row, stats cards, recent transactions, category chips, goals. Replace inline empty state. |
| `frontend/src/pages/Transactions.tsx` | Modify | Add stagger to summary cards and list items. Add filtered empty state variant. |
| `frontend/src/pages/Goals.tsx` | Modify | Add stagger to goal cards. |
| `frontend/src/pages/Accounts.tsx` | Modify | Add stagger to account cards. Replace custom empty state with `<EmptyState>`. |
| `frontend/src/pages/Analytics.tsx` | Modify | Add stagger to hero metrics. Replace inline empty divs with `<EmptyState compact>`. |
| `frontend/src/pages/Budget.tsx` | Modify | Add stagger to overview cards. |
| `frontend/src/pages/Bills.tsx` | Modify | Add stagger to bill list items. |
| `frontend/src/pages/MonthlyReport.tsx` | Modify | Replace inline empty state. |
| `frontend/src/pages/CreditTransactions.tsx` | Modify | Replace inline empty state. |
| `frontend/src/components/notifications/NotificationCenter.tsx` | Modify | Replace inline empty text. |
| `frontend/src/components/savings/SavingsRecommendations.tsx` | Modify | Replace inline empty text. |
| `frontend/src/components/insights/InsightCardList.tsx` | Modify | Replace inline empty text. |
| `frontend/src/components/anomalies/AnomalyAlertList.tsx` | Modify | Replace inline empty text. |
| `frontend/src/components/transactions/TransactionFormModal.tsx` | Modify | Migrate inputs to `<Input>` component, standardize error i18n keys. |
| `frontend/src/components/accounts/AccountFormModal.tsx` | Modify | Migrate inputs to `<Input>` component. |
| Locale files (`en/ja/vi common.json`) | Add keys | Empty state messages + form error messages |

### Files NOT Modified (No Changes Needed)

| File | Reason |
|---|---|
| `CountUp.tsx` | Already has proper animation (rAF + easeOutQuart) |
| `Card.tsx` | Already has variants and hover transitions |
| `ResponsiveModal.tsx` | Already has fade-in and slide-up animations |
| `GoalCreateEmptyState.tsx` | Custom empty state for goal creation UX -- keep separate |
| `DashboardSkeleton.tsx` | Skeleton loading is a different concern from empty states |

---

## 6. Implementation Priority

1. **CSS foundation**: Add timing tokens, `animate-stagger-in`, `animate-shake` to `index.css` and `tailwind.config.js`
2. **Input.tsx enhancement**: Add `helperText`, `success`, shake animation
3. **EmptyState.tsx enhancement**: Add `animated` prop
4. **Page-level stagger**: Apply stagger classes to Dashboard, then Transactions, then remaining pages
5. **Empty state migration**: Replace ad-hoc empty states across all pages
6. **Form validation**: Migrate TransactionFormModal and AccountFormModal inputs, add i18n error keys

---

## 7. Unresolved Questions

1. Should `animate-modal-in` (referenced in `ResponsiveModal.tsx` and `TransactionFormModal.tsx`) be formally defined in `index.css`, or is it coming from an external source? Need to verify.
2. The `GoalCreateEmptyState` is a specialized component with preset year cards -- should it eventually be unified with `EmptyState`, or remain separate? Recommendation: keep separate since it has interactive elements beyond a simple CTA.
3. Should the stagger animation re-trigger on data refetch (e.g., pull-to-refresh), or only on initial mount? Recommendation: only on initial mount to avoid visual noise on refreshes.
