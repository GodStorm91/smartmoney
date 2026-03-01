# Desktop Tabbed UI Research - Index & Overview

**Research Date**: 2026-01-25
**Status**: Complete & Ready for Implementation
**Target**: SmartMoney Budget Management - Phase 3
**Framework**: React/TypeScript with shadcn/ui

---

## Key Finding

Horizontal tabs (3-5) + split-view patterns (list + detail) optimal for desktop, with responsive fallback to accordion/stacked layout on mobile. Based on 20+ sources and real-world fintech app analysis.

---

## Research Documents (Sequential Order)

1. **[01-tab-navigation-patterns.md](./01-tab-navigation-patterns.md)** - Horizontal/vertical tabs, overflow handling
2. **[02-desktop-data-density.md](./02-desktop-data-density.md)** - Split-view, information density, multi-column layouts
3. **[03-responsive-transition-strategies.md](./03-responsive-transition-strategies.md)** - Mobile → tablet → desktop transitions
4. **[04-split-view-budget-categories.md](./04-split-view-budget-categories.md)** - Category list + detail panel patterns
5. **[05-real-world-app-examples.md](./05-real-world-app-examples.md)** - YNAB, Mint, Quicken, Personal Capital analysis
6. **[06-implementation-guide-smartmoney.md](./06-implementation-guide-smartmoney.md)** - Tab structure, React/TypeScript code
7. **[07-best-practices-summary.md](./07-best-practices-summary.md)** - UX checklist, design alignment, unresolved questions

---

## Recommended Layout (Desktop)

```
[Tabs: Overview | Categories | Transactions | Forecast | Settings]
┌─────────────────┬──────────────────────┐
│  Category List  │  Details + Trans     │
│  (280-320px)    │  (Flexible)          │
│                 │                      │
│ • Groceries     │ Groceries            │
│ • Transport ◀───┼─ ¥50,000 budget      │
│ • Utilities     │ ¥32,450 spent (65%)  │
│ • …             │ [Transactions]       │
└─────────────────┴──────────────────────┘
```

---

## See Also

- **Checklist**: [`implementation-checklist.md`](./implementation-checklist.md)
- **Design Guidelines**: `./docs/design-guidelines.md`
- **Budget Components**: `./frontend/src/components/budget/`
