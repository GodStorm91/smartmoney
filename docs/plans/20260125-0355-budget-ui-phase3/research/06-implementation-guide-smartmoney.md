# Implementation Guide for SmartMoney

**Document**: SmartMoney-Specific Recommendations
**Status**: Research Complete & Ready for Implementation
**Focus**: Tab structure, split-view architecture, React/TypeScript patterns

---

## 6.1 Recommended Tab Structure

### Primary Horizontal Tabs (Top Level)

1. **Overview** - Dashboard with KPIs, health indicators
2. **Categories** - Budget category management
3. **Transactions** - Detailed transaction list
4. **Forecast** - Budget projection, trends
5. **Settings** - (Optional) Budget rules, preferences

**Note**: 5 tabs = limit. If more, reorganize hierarchy.

---

## 6.2 Category Management Tab (Split View)

### Desktop (1024px+)

```
Layout: Grid 1fr 2fr
┌─────────────────┬──────────────────────┐
│  CATEGORIES     │  DETAILS + TRANS     │
│  (Left Panel)   │  (Right Panel)       │
│                 │                      │
│ ☰ Groceries ◀──┼─ Groceries          │
│   Progress: 65% │   Budget: ¥50,000    │
│                 │   Spent: ¥32,450     │
│ ☰ Transport     │   Progress: [████ 65%]
│   Progress: 74% │                      │
│                 │   Transactions       │
│ ☰ Utilities     │   ────────────────   │
│   Progress: 85% │   Date | Desc | Amt │
│                 │   Jan 25 | … | 3,2k │
│ [+ Add]         │                      │
└─────────────────┴──────────────────────┘
```

**Specifications:**
- Left panel (fixed): Category tree, 280-320px
- Right panel (fluid): Category details + transactions
- Divider: Visual separator (1px border)
- Both panels scroll independently

### Tablet (768px): Narrower Split

- Left panel: 25% width (icons visible, labels abbreviated)
- Right panel: 75% width

### Mobile (320px): Accordion/Tabs

- Accordion or tab-based switching
- No split view
- Full-width content area

---

## 6.3 Navigation Structure

### Desktop Hierarchy

```
Budget UI
├─ Tabs (Horizontal, top)
│  ├─ Overview
│  ├─ Categories
│  ├─ Transactions
│  ├─ Forecast
│  └─ Settings
├─ Split View (Categories Tab)
│  ├─ Left: Category List (Sidebar)
│  └─ Right: Detail + Transactions
└─ Modal/Drawers (Secondary)
   ├─ Add Category
   ├─ Edit Category
   └─ Category Rules
```

---

## 6.4 React/TypeScript Implementation Pattern

### Using shadcn/ui Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function BudgetUI() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <div className="w-full">
      {/* Horizontal Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="categories">
          {/* Split View Pattern */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
            {/* Left: Category List */}
            <div className="overflow-y-auto border-r">
              <CategoryList
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>

            {/* Right: Category Details */}
            {selectedCategory && (
              <div className="overflow-y-auto">
                <CategoryDetail categoryId={selectedCategory} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Other tabs... */}
      </Tabs>
    </div>
  )
}
```

### Responsive Behavior

```tsx
// Mobile: Stack vertically, no split view
// className="lg:grid-cols-[280px_1fr]" handles this

// Tablet: Adjust left panel width
// className="lg:grid-cols-[20%_80%]" for narrower

// Desktop: Full split view
// className="lg:grid-cols-[280px_1fr]"
```

---

## 6.5 Key Implementation Details

### Tab Triggers (Accessibility)

- Minimum height: 48px (touch-friendly)
- Padding: 12px 24px (horizontal tabs)
- Focus visible: 2px outline, 2px offset
- ARIA: `role="tablist"`, `role="tab"`, `aria-selected="true/false"`

### Active State Visual

- Underline: 3px solid color (primary green #4CAF50)
- Or background color with subtle elevation
- Smooth transition: 150-200ms ease-out

### Split View Divider

- Optional resizable divider (modern approach)
- Or fixed proportional layout (simpler, recommended for MVP)
- Visual: 1px border (gray-200) or 2px spacing

### Scroll Behavior

- Both panels scroll independently
- Sticky headers in detail/transactions panels (optional)
- Smooth scroll enabled (prefers-reduced-motion respected)

### Mobile Fallback

- Tabs collapse into accordion (Collapse/Expand pattern)
- Or use bottom tab bar (like mobile apps)
- Or use drawer/sheet that slides in from bottom

---

## Sources

- [shadcn/ui Tabs Component](https://ui.shadcn.com/docs/components/tabs)
- [Material UI Tabs - React](https://mui.com/material-ui/react-tabs/)
- [Implementing Tabs in shadcn/ui - Medium](https://medium.com/@enayetflweb/implementing-tabs-and-skeleton-components-in-shadcn-ui-bd4485cb5869)
