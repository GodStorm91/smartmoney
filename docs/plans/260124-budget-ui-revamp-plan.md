# Budget UI Revamp Implementation Plan

**Date:** 2026-01-24
**Status:** Ready for Implementation
**Priority:** Mobile-first
**Scope:** Phase 1 + Phase 2

---

## Problem Statement

Budget page needs UX improvements for better usability:
- Status not immediately clear on allocation cards
- No daily spending pace with trend projection
- No confirmation on critical actions
- Category cards lack remaining amount
- Missing donut chart for budget composition overview

---

## Phase 1: Quick Wins (Priority: HIGH)

### Task 1.1: Status Badges on Allocation Cards
**File:** `frontend/src/components/budget/allocation-card.tsx`
**Story Points:** 2

Add visual status indicator to each allocation card:
```
┌─────────────────────────────────────┐
│ 🍔 Food                    ✅ On Track │
│ ¥15,000 / ¥30,000              50%    │
│ ████████░░░░░░░░                     │
│ ¥15,000 remaining                    │
└─────────────────────────────────────┘
```

**Status Logic:**
- ✅ Green: < 80% used
- ⚠️ Yellow: 80-95% used
- 🚨 Red: > 95% or exceeded

**Mobile Considerations:**
- Badge positioned top-right, 24x24px touch target
- Use icon + color (not text) for compact display

---

### Task 1.2: Trend-Based Daily Spending Pace
**File:** `frontend/src/components/budget/budget-projection-card.tsx`
**Story Points:** 3

Calculate projected daily spending based on current trend:

```typescript
// Trend calculation
const daysPassed = daysInMonth - daysRemaining
const dailyAverage = daysPassed > 0 ? totalSpent / daysPassed : 0
const projectedTotal = dailyAverage * daysInMonth
const safeDaily = daysRemaining > 0 ? remainingBudget / daysRemaining : 0

// Display
if (projectedTotal > totalBudget) {
  // Warning: "At current pace, you'll exceed by ¥X"
} else {
  // Safe: "¥X/day to stay on track"
}
```

**UI Display (Mobile):**
```
┌─────────────────────────────────────┐
│ 📊 Daily Pace                       │
│                                     │
│ Current: ¥4,200/day                 │
│ Safe:    ¥3,062/day                 │
│                                     │
│ ⚠️ At this pace, you'll exceed     │
│    budget by ¥12,000                │
└─────────────────────────────────────┘
```

---

### Task 1.3: Confirmation Dialog on Save
**File:** `frontend/src/components/budget/budget-confirm-dialog.tsx` (NEW)
**Story Points:** 2

Add confirmation before saving budget changes:

```
┌─────────────────────────────────────┐
│         Save Budget?                │
│                                     │
│ Monthly Income: ¥300,000            │
│ Total Allocated: ¥270,000           │
│ Savings Target: ¥30,000             │
│                                     │
│ 8 categories configured             │
│                                     │
│  [Cancel]           [Save Budget]   │
└─────────────────────────────────────┘
```

**Mobile:** Full-width bottom sheet dialog

---

### Task 1.4: Enhanced Category Scroll Cards
**File:** `frontend/src/pages/Budget.tsx` (lines 469-500)
**Story Points:** 2

Improve horizontal scroll category cards:

**Before:**
```
┌──────────┐ ┌──────────┐
│ Food     │ │ Transport│
│ ¥15,000  │ │ ¥8,000   │
│ ████░░░░ │ │ ██████░░ │
└──────────┘ └──────────┘
```

**After:**
```
┌──────────────┐ ┌──────────────┐
│ 🍔 Food   ✅ │ │ 🚗 Transport⚠️│
│ ¥15,000      │ │ ¥8,000       │
│ ████░░░░ 50% │ │ ██████░░ 80% │
│ ¥15k left    │ │ ¥2k left     │
└──────────────┘ └──────────────┘
```

**Changes:**
- Add category emoji/icon
- Add status badge (mini)
- Show remaining amount
- Slightly wider cards (140px → 160px)

---

### Task 1.5: ARIA Accessibility Labels
**Files:** Multiple components
**Story Points:** 1

Add screen reader support:

```tsx
// Allocation card
<div
  role="article"
  aria-label={`${category} budget: ${spent} of ${total} spent, ${percentage}% used, status ${status}`}
>

// Progress bar
<div
  role="progressbar"
  aria-valuenow={percentage}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Budget progress: ${percentage}%`}
>
```

---

## Phase 2: Enhancements (Priority: MEDIUM)

### Task 2.1: Donut Chart for Budget Overview
**File:** `frontend/src/components/budget/budget-donut-chart.tsx` (NEW)
**Story Points:** 5

Add visual budget composition chart:

```
        ┌───────────┐
       ╱   ¥45,000   ╲
      │   Remaining   │
      │     (15%)     │
       ╲             ╱
        └───────────┘

  🍔 Food 30%  🚗 Transport 20%
  🏠 Housing 25%  💡 Utils 10%
```

**Implementation:**
- Use existing Recharts library
- Max 5 segments + "Other" for clarity
- Center shows remaining amount
- Legend below on mobile
- Touch segment to highlight

**Mobile Layout:**
- Chart: 200px diameter
- Legend: 2-column grid below
- Total height: ~320px

---

### Task 2.2: Smart Spending Alerts
**File:** `frontend/src/components/budget/spending-alert.tsx` (NEW)
**Story Points:** 3

Contextual alerts based on spending patterns:

**Alert Types:**

1. **Approaching Limit (80%+)**
```
┌─────────────────────────────────────┐
│ ⚠️ Food budget at 85%              │
│ ¥4,500 remaining for 8 days        │
│                        [View]       │
└─────────────────────────────────────┘
```

2. **Exceeded Budget**
```
┌─────────────────────────────────────┐
│ 🚨 Transport exceeded by ¥2,000    │
│ Consider adjusting next month      │
│                        [Adjust]     │
└─────────────────────────────────────┘
```

3. **On Track (Positive)**
```
┌─────────────────────────────────────┐
│ ✅ 5 categories on track           │
│ You're doing great this month!     │
└─────────────────────────────────────┘
```

**Placement:** Above allocation cards, dismissible

---

## File Changes Summary

### New Files
```
frontend/src/components/budget/
├── budget-confirm-dialog.tsx      (Task 1.3)
├── budget-donut-chart.tsx         (Task 2.1)
├── spending-alert.tsx             (Task 2.2)
└── status-badge.tsx               (Task 1.1)
```

### Modified Files
```
frontend/src/components/budget/
├── allocation-card.tsx            (Task 1.1, 1.5)
├── budget-projection-card.tsx     (Task 1.2)
└── ...

frontend/src/pages/
└── Budget.tsx                     (Task 1.4, 2.2)
```

---

## Mobile-First Design Specs

### Touch Targets
- Minimum: 44x44px (Apple HIG)
- Status badges: 24x24px visual, 44x44px touch area
- Cards: Full-width tap area

### Typography (Mobile)
- Category name: 14px semibold
- Amount: 18px bold
- Remaining: 12px regular
- Status text: 12px medium

### Spacing
- Card padding: 16px
- Card gap: 12px
- Section gap: 16px

### Colors (Semantic)
```
--status-good: #22c55e (green-500)
--status-warning: #eab308 (yellow-500)
--status-danger: #ef4444 (red-500)
--status-info: #3b82f6 (blue-500)
```

---

## Implementation Order

```
Week 1:
├── Task 1.1: Status badges (foundation)
├── Task 1.5: ARIA labels (do with 1.1)
└── Task 1.3: Confirm dialog

Week 2:
├── Task 1.2: Trend-based daily pace
└── Task 1.4: Enhanced category cards

Week 3-4:
├── Task 2.1: Donut chart
└── Task 2.2: Smart alerts
```

---

## Testing Checklist

### Functional
- [ ] Status badges update in real-time
- [ ] Daily pace calculation accurate
- [ ] Confirm dialog prevents accidental saves
- [ ] Donut chart renders correctly with 0-10 categories
- [ ] Alerts show/hide based on thresholds

### Mobile
- [ ] All touch targets ≥ 44px
- [ ] Horizontal scroll smooth on category cards
- [ ] Bottom sheet dialogs work correctly
- [ ] No horizontal overflow

### Accessibility
- [ ] Screen reader announces status changes
- [ ] Focus order logical
- [ ] Color contrast ≥ 4.5:1
- [ ] Axe DevTools: 0 errors

### Performance
- [ ] Page load < 600ms
- [ ] Chart renders < 100ms
- [ ] No jank on scroll

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to identify status | 3-4s | <2s |
| User confidence | Baseline | +30% |
| Mobile engagement | Baseline | +15% |
| Accessibility score | TBD | >95 |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Donut chart performance | Limit to 6 segments |
| Alert fatigue | Max 2 alerts visible, dismissible |
| Trend calculation edge cases | Handle 0 days, 0 spending |

---

## Questions Resolved

1. ✅ Phase 1 + Phase 2 scope
2. ✅ Trend-based projection (Option B)
3. ✅ Donut chart in Phase 2 (Option B)
4. ✅ Mobile-first priority

---

**Ready for implementation. Approve to proceed.**
