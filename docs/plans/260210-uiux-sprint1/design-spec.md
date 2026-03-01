# Sprint 1 Visual Design Specification

**Date**: 2026-02-10
**Author**: Designer Agent
**Status**: Final
**Scope**: Micro-interactions, empty states, form validation

---

## 1. Micro-Interaction Design

### 1.1 Design Tokens (Animation)

All animations use GPU-accelerated properties (`transform`, `opacity`) only.
All animations respect `prefers-reduced-motion: reduce` (instant state change, no motion).

| Token Name | Value | Use Case |
|---|---|---|
| `--duration-instant` | `0ms` | Toggle switches, checkbox |
| `--duration-fast` | `150ms` | Button hover, input focus, tooltip |
| `--duration-default` | `250ms` | Card hover, dropdown open |
| `--duration-moderate` | `350ms` | Modal open, slide-in panels |
| `--duration-slow` | `500ms` | Page transitions |
| `--duration-countup` | `800ms` | KPI number animation |
| `--duration-progress` | `600ms` | Progress bar fill |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Entry animations |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | State changes |
| `--ease-spring` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful emphasis (badges, level-up) |

### 1.2 Dashboard Cards (Staggered Entry)

**Current state**: Cards appear instantly with no entrance animation.

**Target behavior**: Cards fade-in with upward slide, staggered by index.

| Property | Value |
|---|---|
| Animation | `fadeInUp` (opacity 0 -> 1, translateY 16px -> 0) |
| Duration | `300ms` |
| Easing | `ease-out` (`cubic-bezier(0, 0, 0.2, 1)`) |
| Stagger delay | `50ms` per card (0ms, 50ms, 100ms, 150ms, ...) |
| Max stagger | Cap at 5 items (250ms total max delay) to avoid sluggish feel |
| Fill mode | `backwards` (invisible before animation starts) |

**CSS implementation pattern**:
```css
.dashboard-card {
  animation: fadeInUp 300ms ease-out backwards;
}
.dashboard-card:nth-child(1) { animation-delay: 0ms; }
.dashboard-card:nth-child(2) { animation-delay: 50ms; }
.dashboard-card:nth-child(3) { animation-delay: 100ms; }
.dashboard-card:nth-child(4) { animation-delay: 150ms; }
.dashboard-card:nth-child(5) { animation-delay: 200ms; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Tailwind approach**: Use Tailwind `animate-` classes via config extension or inline styles with `style={{ animationDelay }}`.

### 1.3 Transaction List Items (Entry Animation)

**Current state**: Items render instantly.

**Target behavior**: List items animate in with stagger, similar to dashboard but subtler.

| Property | Value |
|---|---|
| Animation | `fadeInUp` (same keyframes as dashboard) |
| Duration | `250ms` |
| Easing | `ease-out` |
| Stagger delay | `30ms` per item |
| Max stagger | Cap at 8 items (240ms total max delay) |
| Fill mode | `backwards` |
| Trigger | On mount and on filter/sort change |

**Note**: Only animate the visible items above the fold. Items scrolled into view should appear instantly (no IntersectionObserver animation needed for v1).

### 1.4 KPI Numbers (CountUp)

**Current state**: `CountUp` component exists with `easeOutQuart`, `duration=1000ms`.

**Recommended refinements**:

| Property | Current | Target |
|---|---|---|
| Duration | `1000ms` | `800ms` (slightly snappier) |
| Easing | `easeOutQuart` | `easeOutQuart` (keep; feels premium) |
| Start delay | `0ms` | `200ms` after card entry animation completes |
| Decimals | per-usage | 0 for JPY, 2 for USD/VND |

**Rationale**: The current 1000ms feels slightly sluggish. 800ms with a 200ms delay (synced to card stagger) creates a cascading reveal effect: card slides in, then number counts up.

### 1.5 Quick Action Buttons (Hover + Press)

**Current state**: Only `active:scale-95` on quick action icons.

**Target behavior**:

| State | Property | Value |
|---|---|---|
| Default | `transform` | `scale(1)` |
| Hover | `transform` | `scale(1.08)` |
| Hover | `box-shadow` | `0 4px 12px rgba(0,0,0,0.15)` |
| Hover | transition | `150ms ease-out` |
| Active/Press | `transform` | `scale(0.95)` |
| Active/Press | transition | `50ms ease-in` |
| Focus-visible | `ring` | `2px solid primary-500, offset 2px` |

**Tailwind classes**:
```
transition-all duration-150 ease-out
hover:scale-[1.08] hover:shadow-lg
active:scale-95 active:duration-[50ms]
focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
```

### 1.6 Progress Bars (Fill Animation on Mount)

**Current state**: `Progress` component uses `transition-all duration-300 ease-in-out` on width, but no mount animation (bar appears at final width immediately).

**Target behavior**:

| Property | Value |
|---|---|
| Initial width | `0%` |
| Animate to | Target percentage |
| Duration | `600ms` |
| Easing | `ease-out` (`cubic-bezier(0, 0, 0.2, 1)`) |
| Delay | `300ms` (wait for parent card entry) |
| Color transition | `300ms ease-out` (for status color changes) |

**Implementation approach**: Render with `width: 0%`, then on mount (via `useEffect` + `requestAnimationFrame`), set target width. The existing `transition-all duration-300` handles the visual animation, but increase to `duration-[600ms]`.

### 1.7 Card Hover (General)

**Current state**: Card component has `hover:shadow-md hover:border-gray-300` with `transition-all duration-200`.

**Target behavior** (for interactive/clickable cards only):

| State | Property | Value |
|---|---|---|
| Default | `transform` | none |
| Hover | `transform` | `translateY(-2px)` |
| Hover | `box-shadow` | `0 8px 24px rgba(0,0,0,0.08)` |
| Hover | `border-color` | `gray-300` (light) / `gray-600` (dark) |
| Transition | duration | `250ms ease-out` |

**Note**: Only apply lift effect to cards with `hover={true}` or `onClick` prop. Static display cards should NOT lift.

### 1.8 Net Worth Hero (Expand/Collapse)

**Current state**: Expanded section appears instantly.

**Target behavior**:

| Property | Value |
|---|---|
| Animation | height auto + fadeIn |
| Duration | `250ms` |
| Easing | `ease-in-out` |
| Content | fade in 150ms after expand starts |

**Implementation**: Use CSS `grid-template-rows: 0fr -> 1fr` pattern for smooth height animation, or a library like `framer-motion`'s `AnimatePresence`.

---

## 2. Empty State Design

### 2.1 Component Architecture

Reuse existing `EmptyState` component (`frontend/src/components/ui/EmptyState.tsx`). Current props:
- `icon?: ReactNode` (falls back to `Sparkles`)
- `title: string`
- `description?: string`
- `action?: ReactNode`
- `compact?: boolean`

**No changes to the component API needed**. All customization is done via props per usage context.

### 2.2 Empty State Contexts

#### 2.2.1 No Transactions

| Field | Value |
|---|---|
| **Icon** | `Receipt` (from lucide-react, already imported in transaction files) |
| **i18n key (title)** | `emptyState.transactions.title` |
| **en text** | "No transactions yet" |
| **i18n key (desc)** | `emptyState.transactions.description` |
| **en text** | "Upload a CSV or add your first transaction to start tracking" |
| **CTA label key** | `emptyState.transactions.cta` |
| **CTA en text** | "Add Transaction" |
| **CTA link** | `/transactions?action=add-transaction` |
| **CTA variant** | Primary button |

#### 2.2.2 No Goals

| Field | Value |
|---|---|
| **Icon** | `Target` (already imported in Goals.tsx) |
| **i18n key (title)** | `emptyState.goals.title` |
| **en text** | "Set your first savings goal" |
| **i18n key (desc)** | `emptyState.goals.description` |
| **en text** | "Define targets for 1, 3, 5, or 10 years and track your progress" |
| **CTA label key** | `emptyState.goals.cta` |
| **CTA en text** | "Create Goal" |
| **CTA link** | Opens goal creation modal |
| **CTA variant** | Primary button |

#### 2.2.3 No Budget Allocations

| Field | Value |
|---|---|
| **Icon** | `PieChart` (already imported in Dashboard.tsx) |
| **i18n key (title)** | `emptyState.budget.title` |
| **en text** | "No budget set for this month" |
| **i18n key (desc)** | `emptyState.budget.description` |
| **en text** | "Create a budget to track spending against your plan" |
| **CTA label key** | `emptyState.budget.cta` |
| **CTA en text** | "Create Budget" |
| **CTA link** | Budget creation flow |
| **CTA variant** | Primary button |

#### 2.2.4 No Accounts

| Field | Value |
|---|---|
| **Icon** | `Wallet` (already imported in Dashboard.tsx) |
| **i18n key (title)** | `emptyState.accounts.title` |
| **en text** | "No accounts added yet" |
| **i18n key (desc)** | `emptyState.accounts.description` |
| **en text** | "Add your bank accounts, credit cards, or cash to track balances" |
| **CTA label key** | `emptyState.accounts.cta` |
| **CTA en text** | "Add Account" |
| **CTA link** | Opens account creation modal |
| **CTA variant** | Primary button |

#### 2.2.5 No Categories (Spending Breakdown)

| Field | Value |
|---|---|
| **Icon** | `Tags` (lucide-react, new import) |
| **i18n key (title)** | `emptyState.categories.title` |
| **en text** | "No spending data yet" |
| **i18n key (desc)** | `emptyState.categories.description` |
| **en text** | "Add transactions to see your spending breakdown by category" |
| **CTA label key** | `emptyState.categories.cta` |
| **CTA en text** | "Add Transaction" |
| **CTA link** | `/transactions?action=add-transaction` |
| **CTA variant** | Secondary button (ghost) |

#### 2.2.6 No Analytics Data

| Field | Value |
|---|---|
| **Icon** | `BarChart3` (lucide-react, new import) |
| **i18n key (title)** | `emptyState.analytics.title` |
| **en text** | "Not enough data for analytics" |
| **i18n key (desc)** | `emptyState.analytics.description` |
| **en text** | "Add at least one month of transactions to see trends and insights" |
| **CTA label key** | `emptyState.analytics.cta` |
| **CTA en text** | "Upload CSV" |
| **CTA link** | `/upload` |
| **CTA variant** | Primary button |

#### 2.2.7 No Recurring Bills

| Field | Value |
|---|---|
| **Icon** | `CalendarClock` (lucide-react, new import) |
| **i18n key (title)** | `emptyState.bills.title` |
| **en text** | "No bills to track" |
| **i18n key (desc)** | `emptyState.bills.description` |
| **en text** | "Add recurring bills to get reminders before due dates" |
| **CTA label key** | `emptyState.bills.cta` |
| **CTA en text** | "Add Bill" |
| **CTA link** | Opens bill creation modal |
| **CTA variant** | Primary button |

#### 2.2.8 First-Time User (Dashboard Welcome)

| Field | Value |
|---|---|
| **Icon** | `Sparkles` (already default in EmptyState.tsx) |
| **i18n key (title)** | `emptyState.welcome.title` |
| **en text** | "Welcome to SmartMoney" |
| **i18n key (desc)** | `emptyState.welcome.description` |
| **en text** | "Start by adding an account and importing your transactions" |
| **CTA label key** | `emptyState.welcome.cta` |
| **CTA en text** | "Get Started" |
| **CTA link** | Scroll to or highlight onboarding checklist |
| **CTA variant** | Primary button, larger size |

### 2.3 Empty State Visual Specifications

| Property | Standard Mode | Compact Mode |
|---|---|---|
| Container padding | `py-12 px-4` | `py-6 px-4` |
| Icon container size | `64x64px` (`w-16 h-16`) | `48x48px` (`w-12 h-12`) |
| Icon container shape | `rounded-2xl` | `rounded-2xl` |
| Icon container bg | `bg-gray-100 dark:bg-gray-800` | same |
| Icon size | `32x32px` (`w-8 h-8`) | `24x24px` (`w-6 h-6`) |
| Icon color | `text-gray-400 dark:text-gray-500` | same |
| Title font | `text-base font-semibold` | `text-sm font-semibold` |
| Title color | `text-gray-700 dark:text-gray-300` | same |
| Title margin | `mb-2` | `mb-1.5` |
| Description font | `text-sm` | `text-xs` |
| Description color | `text-gray-500 dark:text-gray-400` | same |
| Description max-width | `max-w-sm` | `max-w-sm` |
| Description margin | `mb-6` | `mb-4` |
| CTA button | Standard primary button | Smaller variant |

### 2.4 Empty State Animation

Empty states should fade in to avoid a jarring appearance:

| Property | Value |
|---|---|
| Animation | `fadeIn` (opacity 0 -> 1) |
| Duration | `300ms` |
| Easing | `ease-out` |
| Delay | `100ms` (brief pause so user perceives the "empty" state intentionally) |

### 2.5 i18n Key Structure

All empty state keys live under the `emptyState` namespace in `common.json`:

```json
{
  "emptyState": {
    "transactions": {
      "title": "No transactions yet",
      "description": "Upload a CSV or add your first transaction to start tracking",
      "cta": "Add Transaction"
    },
    "goals": {
      "title": "Set your first savings goal",
      "description": "Define targets for 1, 3, 5, or 10 years and track your progress",
      "cta": "Create Goal"
    },
    "budget": {
      "title": "No budget set for this month",
      "description": "Create a budget to track spending against your plan",
      "cta": "Create Budget"
    },
    "accounts": {
      "title": "No accounts added yet",
      "description": "Add your bank accounts, credit cards, or cash to track balances",
      "cta": "Add Account"
    },
    "categories": {
      "title": "No spending data yet",
      "description": "Add transactions to see your spending breakdown by category",
      "cta": "Add Transaction"
    },
    "analytics": {
      "title": "Not enough data for analytics",
      "description": "Add at least one month of transactions to see trends and insights",
      "cta": "Upload CSV"
    },
    "bills": {
      "title": "No bills to track",
      "description": "Add recurring bills to get reminders before due dates",
      "cta": "Add Bill"
    },
    "welcome": {
      "title": "Welcome to SmartMoney",
      "description": "Start by adding an account and importing your transactions",
      "cta": "Get Started"
    }
  }
}
```

**Note**: Japanese (ja) and Vietnamese (vi) translations must be added by the team. Keep descriptions short (under 80 chars) for mobile readability.

---

## 3. Form Validation Design

### 3.1 Current State Analysis

The existing `Input` component (`frontend/src/components/ui/Input.tsx`) already supports:
- `error` prop (string) to display error border + message
- Error border: `border-red-500 focus:ring-red-500`
- Error message: `mt-1.5 text-sm text-red-600 dark:text-red-400`

**Gaps to address**:
- No error icon next to input
- No success state (valid field confirmation)
- No helper text pattern (always-visible hint below input)
- Error message could benefit from animation
- No inline validation feedback while typing

### 3.2 Error State

| Property | Light Mode | Dark Mode |
|---|---|---|
| Border color | `border-red-500` (#EF4444) | `border-red-500` |
| Border width | `1px` (default, no change) | same |
| Focus ring | `ring-red-500` (2px) | same |
| Background | `bg-white` (no change) | `bg-gray-800` (no change) |
| Icon | `AlertCircle` (lucide-react), 16px | same |
| Icon color | `text-red-500` | `text-red-400` |
| Icon position | Right side of input, `right-3` absolute | same |
| Message text | `text-sm` (14px) | same |
| Message color | `text-red-600` | `text-red-400` |
| Message position | Below input, `mt-1.5` gap | same |
| Message animation | `fadeInDown` 150ms ease-out | same |

**Error message animation**:
```css
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### 3.3 Success State

| Property | Light Mode | Dark Mode |
|---|---|---|
| Border color | `border-green-500` (#22C55E) | `border-green-500` |
| Focus ring | `ring-green-500` (2px) | same |
| Icon | `CheckCircle2` (lucide-react), 16px | same |
| Icon color | `text-green-500` | `text-green-400` |
| Icon position | Right side of input, `right-3` absolute | same |

**When to show success**: Only after user has interacted with the field AND the value passes validation. Do not show success on pristine/untouched fields.

### 3.4 Helper Text

| Property | Value |
|---|---|
| Font size | `text-xs` (12px) |
| Color (light) | `text-gray-500` |
| Color (dark) | `text-gray-400` |
| Position | Below input, `mt-1` gap |
| Max lines | 2 (truncate with ellipsis if longer) |
| Visibility | Always visible; replaced by error message when error is present |

**Priority**: Error message > Helper text. When both exist, only error message is shown.

### 3.5 Input Component Props (Extended)

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string           // existing
  success?: boolean        // NEW: show green border + checkmark
  helperText?: string      // NEW: hint text below input
  showValidationIcon?: boolean  // NEW: show error/success icon inside input
}
```

### 3.6 Validation Visual Flow

```
[Pristine]          -> Gray border, optional helper text
  |
  v (user types)
[Dirty, Invalid]    -> Red border, error icon, error message (replaces helper)
  |
  v (user corrects)
[Dirty, Valid]      -> Green border, check icon, helper text restored
  |
  v (on blur / submit)
[Submitted, Valid]  -> Green border briefly (300ms), then return to default gray
```

### 3.7 Form-Level Validation Feedback

For forms with multiple fields (e.g., transaction form, goal creation):

| Scenario | Behavior |
|---|---|
| Submit with errors | Scroll to first error field, focus it, shake animation (optional) |
| All fields valid | Submit button enabled, green state |
| Submit button disabled | `opacity-50 cursor-not-allowed`, no hover effect |
| Submit in progress | Show `Loader2` spinner icon, disable button, show loading text |

**Optional shake animation** (for invalid submit attempt):
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
/* Duration: 300ms, ease-in-out */
```

### 3.8 Color Reference (Validation)

| State | Border | Icon | Text | Background |
|---|---|---|---|---|
| Default | `gray-300` / `gray-600` (dark) | none | `gray-900` / `gray-100` | `white` / `gray-800` |
| Focus | `primary-500` + ring | none | no change | no change |
| Error | `red-500` | `red-500` / `red-400` | `red-600` / `red-400` | no change |
| Success | `green-500` | `green-500` / `green-400` | no change | no change |
| Disabled | `gray-300` | none | `gray-500` | `gray-100` / `gray-800` |

### 3.9 Spacing Grid Compliance

All validation elements follow the 8px spacing grid:

| Element | Spacing |
|---|---|
| Label to input | `mb-2` (8px) |
| Input to helper/error text | `mt-1.5` (6px) -- existing, acceptable deviation |
| Error icon inside input | `right-3` (12px from edge) |
| Error icon vertical center | Centered in input height |
| Input padding (with icon) | `pr-10` (40px, room for 16px icon + 12px margins) |

---

## 4. Implementation Notes

### 4.1 Performance

- All animations use `transform` and `opacity` only (GPU-accelerated)
- Use `will-change: transform, opacity` sparingly, only on elements actively animating
- Remove `will-change` after animation completes
- Test on low-end mobile devices (target: 60fps)

### 4.2 Accessibility

- All animations respect `prefers-reduced-motion: reduce` (already in `index.css`)
- Error messages use `role="alert"` or `aria-live="polite"` for screen reader announcement
- Success state announced via `aria-describedby` linked to hidden status text
- Focus management: on form submit error, focus moves to first invalid field
- Color is never the sole indicator -- icons supplement border color changes

### 4.3 Dark Mode Compatibility

All specs include dark mode variants. Key adjustments:
- Error colors shift slightly lighter (red-400 instead of red-600 for text)
- Success colors shift slightly lighter (green-400 instead of green-600)
- Empty state icon container uses `bg-gray-800` instead of `bg-gray-100`
- Ensure contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for UI)

### 4.4 Files to Modify

| File | Changes |
|---|---|
| `frontend/tailwind.config.js` | Add animation keyframes: `fadeInUp`, `fadeInDown`, `shake` |
| `frontend/src/index.css` | Add stagger animation classes if not using Tailwind config |
| `frontend/src/components/ui/Input.tsx` | Add `success`, `helperText`, `showValidationIcon` props |
| `frontend/src/components/ui/EmptyState.tsx` | Add fade-in animation class |
| `frontend/src/components/ui/Progress.tsx` | Add mount animation (start from 0) |
| `frontend/src/components/ui/CountUp.tsx` | Adjust default duration to 800ms |
| `frontend/src/pages/Dashboard.tsx` | Add stagger classes to card wrappers |
| `frontend/src/pages/Transactions.tsx` | Add stagger classes to list items |
| `frontend/src/pages/Goals.tsx` | Use `EmptyState` with specified content |
| `frontend/src/pages/Budget.tsx` | Use `EmptyState` with specified content |
| `frontend/src/pages/Accounts.tsx` | Use `EmptyState` with specified content |
| `frontend/src/pages/Bills.tsx` | Use `EmptyState` with specified content |
| `frontend/src/pages/Analytics.tsx` (if exists) | Use `EmptyState` with specified content |
| `frontend/public/locales/en/common.json` | Add `emptyState.*` keys |
| `frontend/public/locales/ja/common.json` | Add `emptyState.*` keys (needs translation) |
| `frontend/public/locales/vi/common.json` | Add `emptyState.*` keys (needs translation) |

---

## 5. Unresolved Questions

1. **Framer Motion vs CSS-only**: Should we introduce `framer-motion` for complex animations (expand/collapse, layout transitions)? CSS-only is lighter but limited for height animations. Current codebase does not use framer-motion.
2. **IntersectionObserver for scroll animations**: Should list items below the fold animate when scrolled into view? Recommend deferring to Sprint 2 to keep scope manageable.
3. **Form shake on invalid submit**: This is marked optional. Should it be included in Sprint 1 or deferred?
