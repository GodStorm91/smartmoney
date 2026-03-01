# Desktop-Specific Layouts & Data Density Optimization

**Document**: Desktop Layout Architecture
**Status**: Research Complete
**Focus**: Split-view patterns, information density, multi-column layouts

---

## 2.1 Split-View Pattern (List + Detail)

**Architecture:**
```
Desktop (1024px+):
┌─────────────────┬──────────────────────────┐
│  Categories     │  Category Details        │
│  (List)         │  (Detail Panel)          │
│                 │                          │
│ • Groceries     │ Groceries                │
│ • Transport     │ Budget: ¥50,000          │
│ • Utilities ▶   │ Spent: ¥32,450           │
│ • Entertainment │ Remaining: ¥17,550       │
│                 │ Progress: 65%            │
│ • Other         │                          │
│                 │ [Transactions List]      │
└─────────────────┴──────────────────────────┘

Tablet (768px-1023px):
┌─────────────────┬────────────┐
│ [Tabs/Accordion]│ [Detail]   │
│ Groceries ▶     │            │
└─────────────────┴────────────┘

Mobile (320px-767px):
┌──────────────┐
│[Detail Only] │
│ (tap to see  │
│  list)       │
└──────────────┘
```

**Key Advantages:**
- View list and details simultaneously
- Quick scanning and selection on desktop
- Reduces clicks needed (single pane = double-click to view details)
- Natural use of wide screens (16:9, 21:9)
- Familiar pattern (email clients, IDEs, file managers)

**Design Principles:**
- Left panel: 25-30% width, scrollable, fixed height
- Right panel: 70-75% width, scrollable independently
- Divider: Resizable (optional), 1-2px visual separator
- Both panels scroll independently vertically
- Minimum widths: left 280px, right 400px

---

## 2.2 Data Density Optimization

**Desktop vs Mobile Information Density:**
- Mobile: 1 column, 40-50px card height, generous whitespace
- Desktop: Can accommodate 2-3x more information per view
- Comfortable density: 65-70% fill rate (not 100% packed)

### Tactics for Density Without Sacrificing UX:

**1. Condensed Table Layouts**
- Smaller fonts: 12-13px (labels), 14px (data)
- Reduced padding: 8px vertical, 12px horizontal in cells
- Inline actions: edit/delete icons in row, not separate column
- Right-align numeric data (amount, percentage)
- Sortable headers with visual indicators

**Example Table Row:**
```
Groceries | ¥32,450 | ¥50,000 | 65% | ⚙️ |
          | Spent   | Budget  | Progress | Actions
```

**2. Progressive Disclosure**
- Hide secondary info behind "More" or "…" menu
- Expandable rows for detailed info
- Hover reveals additional context
- Tooltip on hover for dense labels

**3. Collapsible Sections**
- Group related budget categories by type
- Collapse less-viewed sections (e.g., savings, investments)
- Remember collapse state (localStorage)
- Smooth animations on expand/collapse

**4. Responsive Typography**
- Desktop: 16px body, 24px headings (large, spacious)
- Can reduce to 14px body when density critical
- Number formatting: ¥50,000 (not ¥ 50,000)
- Abbreviated labels: "Budget" not "Monthly Budget"

**5. Card Density Settings (User Control)**
- Toggle: "Compact View" / "Comfortable View" / "Spacious View"
- Saves preference to user settings
- Adjusts padding, font size, row height
- Empowers power users and accommodates different preferences

---

## 2.3 Multi-Column Layouts

**3-Column Pattern (Advanced):**
```
┌──────────┬─────────────────┬──────────────┐
│ Filter   │ Category List   │ Details +    │
│ Panel    │                 │ Transactions │
│          │ • Groceries ▶   │              │
│ [Filters]│ • Transport     │ [Content]    │
│          │ • Utilities     │              │
│          │ • …             │              │
└──────────┴─────────────────┴──────────────┘
```

- Left: Fixed filters (120-150px)
- Center: Category list (200-280px)
- Right: Details + transactions (flexible)
- Each section scrolls independently
- More desktop-optimized than 2-column

**When to Use:**
- Complex filtering needs
- Multiple navigation levels
- Power users (accountants, finance managers)
- Large screens (1600px+)

---

## Sources

- [Designing for Data Density - Paul Wallas, Medium](https://paulwallas.medium.com/designing-for-data-density-what-most-ui-tutorials-wont-teach-you-091b3e9b51f4)
- [Balancing Information Density - LogRocket](https://blog.logrocket.com/ux-design/balancing-information-density-in-web-development/)
- [Complex Desktop Interfaces - Medium Bootcamp](https://medium.com/design-bootcamp/designing-complex-desktop-interfaces-d749f39d60ae)
- [Data Table Design UX Patterns - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Split Screen - Material Design](https://m1.material.io/layout/split-screen.html)
