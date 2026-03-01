# Split-View Patterns for Budget Categories

**Document**: Budget Category Split View Design
**Status**: Research Complete
**Focus**: Category list + detail panel, responsive collapse

---

## 4.1 Budget Categories Split View

### Left Panel (Category List): 25-30% width

```
Categories
─────────────────────
☰ Groceries
  Budget: ¥50,000
  Spent: ¥32,450
  Progress: 65%

☰ Transport
  Budget: ¥30,000
  Spent: ¥22,100
  Progress: 74%

☰ Utilities
  Budget: ¥15,000
  Spent: ¥12,800
  Progress: 85%

[+ Add]
```

**Features:**
- Category name with icon
- Quick stats: budget, spent, % progress
- Progress bar visual (colored: green <80%, yellow 80-95%, red >95%)
- Search/filter capability
- Expand/collapse for subcategories
- Click to select and view details

### Right Panel (Category Details): 70-75% width

```
Groceries
─────────────────────────────────────
Budget:      ¥50,000
Spent:       ¥32,450 (65%)
Remaining:   ¥17,550
Forecast:    ¥48,900 (on track)
Days Left:   6

[Progress Bar: 65%]

Recent Transactions
─────────────────────────────────────
Jan 25 | Supermarket A    | ¥3,200 | [⋯]
Jan 24 | Convenience Str. | ¥1,850 | [⋯]
Jan 23 | Market B         | ¥5,400 | [⋯]

[View All Transactions] [Add Transaction]
```

**Features:**
- Detailed metrics (budget, spent, remaining)
- Visual progress bar with percentage
- Forecast projection (if available)
- Time remaining in period
- Recent transactions table (5-7 rows visible)
- Quick action buttons (add, edit, view all)

---

## 4.2 Responsive Collapse Pattern

### Tablet (768px): Narrower Split

```
┌─────────┬──────────────────┐
│ Cat     │ Category Details │
│ Gro…    │                  │
│ Tra…    │ [Content]        │
└─────────┴──────────────────┘
```

- Left panel: 20% width (abbreviated labels)
- Icons only, with tooltip on hover
- Right panel: 80% width

### Mobile: Accordion/Tabs

```
┌──────────────────┐
│ Groceries ▼      │
├──────────────────┤
│ Budget: ¥50,000  │
│ Spent: ¥32,450   │
│ Progress: 65%    │
│                  │
│ [Transactions]   │
└──────────────────┘
```

- Single pane, toggle to view different categories
- Or use horizontal swipe to see next category
- Vertical scroll for details

---

## Sources

- [Data Table Design UX Patterns - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Categories - Actual Budget](https://actualbudget.org/docs/budgeting/categories/)
- [UI Design for Web and Desktop - Design+Code](https://designcode.io/web-app-ui-design/)
