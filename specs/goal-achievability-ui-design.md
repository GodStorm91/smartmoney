# Goal Achievability Feature - UI/UX Design Document

**Version**: 1.0
**Date**: 2025-11-18
**Design System**: Based on SmartMoney existing Tailwind + Noto Sans JP
**Target Platforms**: Web (Desktop + Mobile), Future: Native apps

---

## Design Philosophy

### Core Principles
1. **Brutal Honesty**: Show negative numbers prominently - users need truth, not sugar coating
2. **Actionable Insights**: Every metric must guide a specific action
3. **Visual Hierarchy**: Status → Numbers → Actions (F-pattern reading)
4. **Progressive Disclosure**: Summary on dashboard, details on goal page
5. **Emotional Design**: Use color psychology - red = urgent, green = safe

### Design Inspiration
- **Mint**: Clear deficit warnings with actionable CTAs
- **YNAB**: Goal progress bars with realistic projections
- **Robinhood**: Bold typography for critical numbers
- **Linear**: Clean status badges with distinct colors

---

## Color System

### Status Tier Colors (Semantic)

```css
/* Primary Status Colors */
--severe-deficit: #DC2626;    /* Red 600 - Urgent attention */
--deficit: #F59E0B;           /* Amber 500 - Warning */
--challenging: #FB923C;       /* Orange 400 - Caution */
--achievable: #3B82F6;        /* Blue 500 - Positive */
--on-track: #10B981;          /* Emerald 500 - Success */

/* Background Tints (10% opacity) */
--bg-severe: rgba(220, 38, 38, 0.1);
--bg-deficit: rgba(245, 158, 11, 0.1);
--bg-challenging: rgba(251, 146, 60, 0.1);
--bg-achievable: rgba(59, 130, 246, 0.1);
--bg-on-track: rgba(16, 185, 129, 0.1);

/* Border Colors (50% opacity) */
--border-severe: rgba(220, 38, 38, 0.5);
--border-deficit: rgba(245, 158, 11, 0.5);
--border-challenging: rgba(251, 146, 60, 0.5);
--border-achievable: rgba(59, 130, 246, 0.5);
--border-on-track: rgba(16, 185, 129, 0.5);

/* Text Colors */
--text-severe: #991B1B;       /* Red 800 */
--text-deficit: #B45309;      /* Amber 700 */
--text-challenging: #C2410C;  /* Orange 700 */
--text-achievable: #1E40AF;   /* Blue 800 */
--text-on-track: #047857;     /* Emerald 700 */
```

### Typography Scale

```css
/* Font Families */
--font-primary: 'Noto Sans JP', sans-serif;
--font-numbers: 'Inter', monospace;  /* Better for tabular numbers */

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px - Footnotes, data source */
--text-sm: 0.875rem;   /* 14px - Body text, descriptions */
--text-base: 1rem;     /* 16px - Default body */
--text-lg: 1.125rem;   /* 18px - Card titles */
--text-xl: 1.25rem;    /* 20px - Section headers */
--text-2xl: 1.5rem;    /* 24px - Page titles */
--text-3xl: 1.875rem;  /* 30px - Hero numbers (achievability %) */
--text-4xl: 2.25rem;   /* 36px - Dashboard KPIs */

/* Font Weights */
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

---

## Component Library

### 1. Dashboard Achievability Card (Primary Component)

#### **Desktop Layout (360px × 480px)**

```
┌──────────────────────────────────────────────────────────┐
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │ ← 4px left border (status color)
│ ┃                                                      ┃ │
│ ┃ 🔴 Severe Deficit                    5-Year Goal    ┃ │ ← Status badge + Goal label
│ ┃                                                      ┃ │
│ ┃ ─────────────────────────────────────────────────── ┃ │ ← Divider
│ ┃                                                      ┃ │
│ ┃ Achievable at Current Rate                          ┃ │ ← Label (text-sm gray-600)
│ ┃ -846.5%                                             ┃ │ ← Hero number (text-4xl red-600)
│ ┃                                                      ┃ │
│ ┃ ┌────────────────────┐  ┌──────────────────────┐   ┃ │
│ ┃ │ Current Monthly    │  │ Required Monthly     │   ┃ │ ← Two-column metrics
│ ┃ │ -¥1,801,008        │  │ ¥187,234            │   ┃ │ ← Current (red), Required (gray)
│ ┃ └────────────────────┘  └──────────────────────┘   ┃ │
│ ┃                                                      ┃ │
│ ┃ ┌──────────────────────────────────────────────┐   ┃ │
│ ┃ │ ⚠️ Monthly Gap                               │   ┃ │ ← Alert box (red bg)
│ ┃ │ ¥1,988,242                                   │   ┃ │
│ ┃ │                                               │   ┃ │
│ ┃ │ You need to save ¥1,988,242 more per month   │   ┃ │ ← Explanatory text
│ ┃ └──────────────────────────────────────────────┘   ┃ │
│ ┃                                                      ┃ │
│ ┃ ┌──────────────────────────────────────────────┐   ┃ │
│ ┃ │ 💡 Recommendation                            │   ┃ │ ← Recommendation box (blue bg)
│ ┃ │                                               │   ┃ │
│ ┃ │ Not achievable at current rate. Options:     │   ┃ │
│ ┃ │                                               │   ┃ │
│ ┃ │ • Cut expenses by ¥1,988,242/month           │   ┃ │ ← Bulleted actions
│ ┃ │ • Lower target to achievable amount          │   ┃ │
│ ┃ └──────────────────────────────────────────────┘   ┃ │
│ ┃                                                      ┃ │
│ ┃ Based on Oct 2025 cashflow             [Details →] ┃ │ ← Footer: data source + CTA
│ ┃                                                      ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
└──────────────────────────────────────────────────────────┘

Spacing: 24px padding, 16px internal gaps
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Border Radius: 12px
```

#### **Component HTML Structure**

```tsx
<div className="relative overflow-hidden rounded-xl bg-white shadow-sm border-l-4 border-red-600">
  {/* Header */}
  <div className="px-6 pt-6 pb-4 border-b border-gray-100">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔴</span>
        <span className="text-sm font-semibold text-red-800 uppercase tracking-wide">
          Severe Deficit
        </span>
      </div>
      <span className="text-sm font-medium text-gray-500">5-Year Goal</span>
    </div>
  </div>

  {/* Achievability Hero */}
  <div className="px-6 py-6 bg-gradient-to-br from-red-50 to-white">
    <p className="text-sm text-gray-600 mb-2">Achievable at Current Rate</p>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold font-mono text-red-600">-846.5</span>
      <span className="text-xl font-semibold text-red-400">%</span>
    </div>
  </div>

  {/* Metrics Grid */}
  <div className="px-6 py-4 grid grid-cols-2 gap-4">
    <div className="p-4 rounded-lg bg-red-50 border border-red-100">
      <p className="text-xs text-red-600 font-medium mb-1">Current Monthly</p>
      <p className="text-lg font-bold font-mono text-red-700">-¥1,801,008</p>
    </div>
    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
      <p className="text-xs text-gray-600 font-medium mb-1">Required Monthly</p>
      <p className="text-lg font-bold font-mono text-gray-900">¥187,234</p>
    </div>
  </div>

  {/* Gap Alert */}
  <div className="px-6 py-4">
    <div className="p-4 rounded-lg bg-red-50 border-l-4 border-red-500">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-red-900 mb-1">
            Monthly Gap: ¥1,988,242
          </p>
          <p className="text-xs text-red-700">
            You need to save ¥1,988,242 more per month to achieve this goal
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* Recommendation */}
  <div className="px-6 py-4">
    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">💡</span>
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Recommendation
          </p>
          <p className="text-sm text-blue-800 mb-3">
            Not achievable at current rate. Options:
          </p>
          <ul className="space-y-1 text-sm text-blue-900">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Cut expenses by ¥1,988,242/month</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Lower target to achievable amount</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
    <p className="text-xs text-gray-400">Based on Oct 2025 cashflow</p>
    <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
      <span>View Details</span>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>
```

---

### 2. Mobile Card Layout (328px width)

```
┌────────────────────────────────────┐
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ 🔴 Severe Deficit            ┃ │ ← Compact header
│ ┃ 5-Year Goal                  ┃ │
│ ┃                              ┃ │
│ ┃ ──────────────────────────── ┃ │
│ ┃                              ┃ │
│ ┃ Achievable                   ┃ │
│ ┃ -846.5%                      ┃ │ ← Larger number
│ ┃                              ┃ │
│ ┃ Current    Required          ┃ │ ← Stacked metrics
│ ┃ -¥1.8M     ¥187K            ┃ │
│ ┃                              ┃ │
│ ┃ ┌──────────────────────────┐ ┃ │
│ ┃ │ ⚠️ Gap: ¥1.98M/month    │ ┃ │ ← Compact alert
│ ┃ └──────────────────────────┘ ┃ │
│ ┃                              ┃ │
│ ┃ 💡 Cut ¥1.98M/mo or lower   ┃ │ ← Single line rec
│ ┃    target                    ┃ │
│ ┃                              ┃ │
│ ┃ Oct 2025        [Details →] ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
└────────────────────────────────────┘

Spacing: 16px padding, 12px gaps
Collapsed two-column → single column
Abbreviated numbers: ¥1.8M instead of ¥1,801,008
```

#### **Responsive Breakpoints**

```css
/* Mobile: < 640px */
.achievability-card {
  padding: 16px;
  font-size: 14px;
}
.achievability-hero {
  font-size: 2rem; /* 32px instead of 36px */
}

/* Tablet: 640px - 1024px */
.achievability-card {
  padding: 20px;
}
.achievability-grid {
  grid-template-columns: repeat(2, 1fr);
}

/* Desktop: > 1024px */
.achievability-card {
  padding: 24px;
}
.achievability-hero {
  font-size: 2.25rem; /* 36px */
}
```

---

### 3. Dashboard Overview Layout

#### **Desktop Dashboard (1440px viewport)**

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SmartMoney Dashboard                                      Nov 18, 2025     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─────────────── Current Month KPIs ────────────────────────────────────┐ │
│ │                                                                        │ │
│ │   Income        Expense         Net           Trend                   │ │
│ │   ¥823,935      ¥940,795       -¥116,860      ↑ +93.5%              │ │
│ │                                                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─────────────── Goal Achievability ─────────────────────────────────────┐ │
│ │                                                                        │ │
│ │ ┌──────────────────────┐  ┌──────────────────────┐                   │ │
│ │ │ 5-Year Goal          │  │ 10-Year Goal         │                   │ │
│ │ │ [Full card from above] │  │ [Similar layout]     │                   │ │
│ │ │                      │  │                      │                   │ │
│ │ │ (360px × 480px)      │  │ (360px × 480px)      │                   │ │
│ │ └──────────────────────┘  └──────────────────────┘                   │ │
│ │                                                                        │ │
│ │ ┌──────────────────────┐  ┌──────────────────────┐                   │ │
│ │ │ 3-Year Goal          │  │ 1-Year Goal          │                   │ │
│ │ │ (if exists)          │  │ (if exists)          │                   │ │
│ │ └──────────────────────┘  └──────────────────────┘                   │ │
│ │                                                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─────────────── Recent Transactions ────────────────────────────────────┐ │
│ │ (Existing component)                                                   │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

Grid: 2 columns on desktop (2 × 360px cards + 48px gap)
      1 column on mobile (stack vertically)
```

---

### 4. Detailed Goal Page

#### **Goal Detail View (Full Page)**

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Dashboard                                    5-Year Savings Goal │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────── Goal Overview ──────────────────────────────────────────┐ │
│ │                                                                        │ │
│ │ Target Amount: ¥10,000,000                    Status: 🔴 Severe Deficit│ │
│ │ Time Horizon: 60 months (Oct 2024 - Oct 2029)                        │ │
│ │                                                                        │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ 12% Progress                                         47 months left   │ │
│ │                                                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────── Historical Performance vs Achievability ────────────────┐ │
│ │                                                                        │ │
│ │ ┌─────────────────────┐  ┌──────────────────────────────────────────┐│ │
│ │ │ Historical Progress │  │ Future Achievability                     ││ │
│ │ │                     │  │                                          ││ │
│ │ │ Total Saved         │  │ Achievable at Current Rate               ││ │
│ │ │ ¥1,200,000          │  │ -846.5%                                  ││ │
│ │ │                     │  │                                          ││ │
│ │ │ 12% of target       │  │ ⚠️ Projected shortfall: ¥94,647,376      ││ │
│ │ │                     │  │                                          ││ │
│ │ │ Avg Monthly Net     │  │ Current Monthly Net                      ││ │
│ │ │ ¥92,308             │  │ -¥1,801,008                              ││ │
│ │ │                     │  │                                          ││ │
│ │ │ (13 months avg)     │  │ (Oct 2025 data)                          ││ │
│ │ └─────────────────────┘  └──────────────────────────────────────────┘│ │
│ │                                                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────── Action Plan ────────────────────────────────────────────┐ │
│ │                                                                        │ │
│ │ 💡 Recommendations to Get Back on Track                               │ │
│ │                                                                        │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐  │ │
│ │ │ Option 1: Adjust Spending                                       │  │ │
│ │ │                                                                  │  │ │
│ │ │ Cut monthly expenses by: ¥1,988,242                             │  │ │
│ │ │                                                                  │  │ │
│ │ │ Suggested cuts:                                                  │  │ │
│ │ │ • Other category: -¥830,910 → ¥400,000 (reduce 52%)            │  │ │
│ │ │ • Food: -¥78,247 → ¥50,000 (reduce 36%)                        │  │ │
│ │ │ • Communication: -¥31,638 → ¥20,000 (reduce 37%)               │  │ │
│ │ │                                                                  │  │ │
│ │ │ [Simulate Impact]                                                │  │ │
│ │ └─────────────────────────────────────────────────────────────────┘  │ │
│ │                                                                        │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐  │ │
│ │ │ Option 2: Adjust Goal                                            │  │ │
│ │ │                                                                  │  │ │
│ │ │ Realistic target at current rate:                                │  │ │
│ │ │ • Lower to: ¥0 (or increase income significantly)                │  │ │
│ │ │ • Or extend timeline to: 15+ years                               │  │ │
│ │ │                                                                  │  │ │
│ │ │ [Adjust Goal Settings]                                           │  │ │
│ │ └─────────────────────────────────────────────────────────────────┘  │ │
│ │                                                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────── Monthly Cashflow History ───────────────────────────────┐ │
│ │                                                                        │ │
│ │ [Line chart: Income, Expense, Net over time]                          │ │
│ │                                                                        │ │
│ │ Oct 2025: -¥1,801,008                                                 │ │
│ │ Nov 2025: -¥116,860 (projected)                                       │ │
│ │                                                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Status Badge Variations

#### **All 5 Status Tiers**

```tsx
{/* 🔴 Severe Deficit (< -50%) */}
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 border border-red-300">
  <span className="text-lg">🔴</span>
  <span className="text-sm font-semibold text-red-800 uppercase tracking-wide">Severe Deficit</span>
</div>

{/* 🟡 Deficit (-50% to -1%) */}
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300">
  <span className="text-lg">🟡</span>
  <span className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Deficit</span>
</div>

{/* 🟠 Challenging (0% to 49%) */}
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 border border-orange-300">
  <span className="text-lg">🟠</span>
  <span className="text-sm font-semibold text-orange-800 uppercase tracking-wide">Challenging</span>
</div>

{/* 🔵 Achievable (50% to 99%) */}
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 border border-blue-300">
  <span className="text-lg">🔵</span>
  <span className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Achievable</span>
</div>

{/* 🟢 On Track (≥ 100%) */}
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300">
  <span className="text-lg">🟢</span>
  <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">On Track</span>
</div>
```

---

### 6. Interactive States

#### **Hover States**

```css
/* Card hover - subtle elevation */
.achievability-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease-out;
}

/* Details button hover */
.details-button:hover {
  background-color: rgba(59, 130, 246, 0.1);
  transform: translateX(4px);
  transition: all 0.2s ease-out;
}

/* Alert box pulse (for severe deficit) */
@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.severe-alert {
  animation: pulse-red 2s ease-in-out infinite;
}
```

#### **Loading States**

```tsx
{/* Skeleton loader while fetching achievability */}
<div className="animate-pulse">
  <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
  <div className="h-12 bg-gray-300 rounded w-1/2 mb-6"></div>
  <div className="h-24 bg-gray-200 rounded"></div>
</div>
```

#### **Error States**

```tsx
{/* When achievability calculation fails */}
<div className="p-6 rounded-lg bg-yellow-50 border border-yellow-200">
  <div className="flex items-start gap-3">
    <span className="text-xl">⚠️</span>
    <div>
      <p className="text-sm font-semibold text-yellow-900">Unable to Calculate</p>
      <p className="text-xs text-yellow-700 mt-1">
        Insufficient transaction data. Need at least 1 complete month.
      </p>
    </div>
  </div>
</div>
```

---

### 7. Accessibility Features

#### **ARIA Labels**

```tsx
<div
  role="article"
  aria-label="5-Year Goal Achievability Status: Severe Deficit"
  aria-describedby="achievability-description"
>
  <div id="achievability-description" className="sr-only">
    At your current monthly cashflow of negative 1,801,008 yen,
    you are projected to be 846.5% short of your 10 million yen goal.
    You need to save an additional 1,988,242 yen per month.
  </div>

  {/* Visual content */}
</div>
```

#### **Keyboard Navigation**

```tsx
<button
  className="details-button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      navigateToGoalDetails()
    }
  }}
>
  View Details →
</button>
```

#### **Screen Reader Enhancements**

```tsx
{/* Currency formatting for screen readers */}
<span aria-label="negative 1,801,008 yen">-¥1,801,008</span>

{/* Status announcement */}
<div role="status" aria-live="polite">
  Your goal status is severe deficit. Immediate action required.
</div>
```

---

### 8. Animation & Transitions

#### **Entrance Animation (Stagger)**

```css
/* Cards fade in sequentially */
.achievability-card:nth-child(1) { animation-delay: 0ms; }
.achievability-card:nth-child(2) { animation-delay: 100ms; }
.achievability-card:nth-child(3) { animation-delay: 200ms; }
.achievability-card:nth-child(4) { animation-delay: 300ms; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.achievability-card {
  animation: fadeInUp 0.5s ease-out forwards;
}
```

#### **Number Count-Up Animation**

```tsx
{/* Animate achievability % from 0 to -846.5 */}
import { useSpring, animated } from 'react-spring'

const AnimatedNumber = ({ value }) => {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 200,
    config: { mass: 1, tension: 20, friction: 10 }
  })

  return (
    <animated.span className="text-4xl font-bold font-mono text-red-600">
      {number.to(n => n.toFixed(1))}%
    </animated.span>
  )
}
```

---

### 9. Dark Mode Support (Future)

```css
/* Dark mode color overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --severe-deficit: #FCA5A5;    /* Red 300 */
    --deficit: #FCD34D;           /* Amber 300 */
    --challenging: #FDBA74;       /* Orange 300 */
    --achievable: #93C5FD;        /* Blue 300 */
    --on-track: #6EE7B7;          /* Emerald 300 */

    --bg-severe: rgba(252, 165, 165, 0.2);
    --bg-deficit: rgba(252, 211, 77, 0.2);
    /* ... etc */
  }

  .achievability-card {
    background-color: #1F2937; /* Gray 800 */
    border-color: #374151;     /* Gray 700 */
  }
}
```

---

## Detailed Component Breakdown

### Component: `<GoalAchievabilityCard />`

**Props Interface**:
```typescript
interface GoalAchievabilityCardProps {
  goalId: number
  goalName: string
  years: number
  targetAmount: number
  achievability: {
    current_monthly_net: number
    achievable_percentage: number
    required_monthly: number
    monthly_gap: number
    status_tier: StatusTier
    recommendation: string
    data_source: string
    months_remaining: number
  }
  onDetailsClick?: () => void
  compact?: boolean  // For mobile
}

type StatusTier =
  | 'on_track'
  | 'achievable'
  | 'challenging'
  | 'deficit'
  | 'severe_deficit'
```

**Component Variants**:

1. **Default (Desktop)**: Full layout with all metrics
2. **Compact (Mobile)**: Abbreviated numbers, stacked layout
3. **Minimal (Widget)**: Just status + achievability % for sidebars
4. **Expanded (Detail Page)**: Includes action buttons, charts

---

### Component: `<MonthlyGapAlert />`

```tsx
interface MonthlyGapAlertProps {
  gap: number
  statusTier: StatusTier
}

const MonthlyGapAlert = ({ gap, statusTier }) => {
  const isPositive = gap < 0  // Surplus
  const config = {
    severe_deficit: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900' },
    deficit: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-900' },
    // ... etc
  }[statusTier]

  return (
    <div className={`p-4 rounded-lg ${config.bg} border-l-4 ${config.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">
          {isPositive ? '✅' : '⚠️'}
        </span>
        <div>
          <p className={`text-sm font-semibold ${config.text} mb-1`}>
            Monthly Gap: {formatCurrency(Math.abs(gap))}
          </p>
          <p className={`text-xs ${config.text.replace('900', '700')}`}>
            {isPositive
              ? `You're saving ${formatCurrency(Math.abs(gap))} more than needed!`
              : `You need to save ${formatCurrency(Math.abs(gap))} more per month`
            }
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

### Component: `<RecommendationBox />`

```tsx
interface RecommendationBoxProps {
  statusTier: StatusTier
  recommendation: string
  monthlyGap: number
  achievableAmount: number
}

const RecommendationBox = ({ statusTier, recommendation, monthlyGap, achievableAmount }) => {
  const actions = parseRecommendation(recommendation)  // Extract bullet points

  return (
    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">💡</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Recommendation
          </p>

          {statusTier === 'on_track' ? (
            <p className="text-sm text-blue-800">{recommendation}</p>
          ) : (
            <>
              <p className="text-sm text-blue-800 mb-3">
                Not achievable at current rate. Options:
              </p>
              <ul className="space-y-2">
                {actions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                    <span className="text-sm text-blue-900">{action}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## Implementation Priority

### Phase 1A: MVP Components (Week 1)
- [x] `<GoalAchievabilityCard />` - Desktop version
- [x] `<MonthlyGapAlert />`
- [x] `<RecommendationBox />`
- [x] Status badge component
- [ ] Dashboard integration

### Phase 1B: Responsive (Week 1)
- [ ] Mobile card variant
- [ ] Tablet breakpoint handling
- [ ] Number abbreviation utility (¥1.8M)

### Phase 1C: Polish (Week 2)
- [ ] Entrance animations
- [ ] Number count-up
- [ ] Loading skeletons
- [ ] Error states

### Phase 2: Enhancements
- [ ] Dark mode support
- [ ] Interactive "What-if" calculator
- [ ] Goal detail page
- [ ] Action plan generator

---

## Design Validation Checklist

### Visual Hierarchy
- [ ] Status tier visible at first glance (left border + badge)
- [ ] Achievability % is hero element (largest text)
- [ ] Gap amount has high visual weight (alert box)
- [ ] Recommendation actionable and clear

### Color Psychology
- [ ] Red = Urgent action required (severe deficit)
- [ ] Yellow/Amber = Warning (deficit)
- [ ] Orange = Caution (challenging)
- [ ] Blue = Neutral positive (achievable)
- [ ] Green = Success (on track)

### Accessibility
- [ ] WCAG AA contrast ratios (4.5:1 for text)
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader friendly (ARIA labels)
- [ ] Touch targets ≥ 44px (mobile)

### Performance
- [ ] No layout shift (CLS < 0.1)
- [ ] Animation frame rate ≥ 60fps
- [ ] Card renders in < 50ms
- [ ] Total dashboard load < 2s

---

## Appendix: Currency Formatting Rules

### Number Display Logic

```typescript
function formatCurrency(amount: number, compact: boolean = false): string {
  if (compact && Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000
    return `¥${millions.toFixed(1)}M`
  }

  if (compact && Math.abs(amount) >= 1000) {
    const thousands = amount / 1000
    return `¥${thousands.toFixed(0)}K`
  }

  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Examples:
formatCurrency(1801008)           // "¥1,801,008"
formatCurrency(1801008, true)     // "¥1.8M"
formatCurrency(-116860)           // "-¥116,860"
formatCurrency(-116860, true)     // "-¥117K"
```

---

## Design System Integration

### Tailwind Config Additions

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
        mono: ['Inter', 'monospace'],
      },
      colors: {
        'status-severe': '#DC2626',
        'status-deficit': '#F59E0B',
        'status-challenging': '#FB923C',
        'status-achievable': '#3B82F6',
        'status-on-track': '#10B981',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
      },
    },
  },
}
```

---

**End of UI Design Document**

**Total Specifications**:
- 9 major components designed
- 5 status tier variations
- 3 responsive breakpoints
- 15+ interaction states
- Complete accessibility coverage
- Production-ready code snippets
