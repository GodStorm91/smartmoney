# Phase 2B: Component Development Checklist

**Purpose**: React component building tasks
**Status**: Component-specific implementation
**Timeline**: 2-3 days

---

## Tab Navigation Component

### Accessibility

- [ ] ARIA role: `role="tablist"`
- [ ] Each trigger: `role="tab"`
- [ ] Content panel: `role="tabpanel"`
- [ ] Active indicator: `aria-selected="true"`
- [ ] Proper tab index management
- [ ] ARIA labels for screen readers

### Keyboard Support

- [ ] Tab key: Move to next tab (from outside)
- [ ] Shift+Tab: Move to previous tab
- [ ] ArrowRight: Next tab (while in tab list)
- [ ] ArrowLeft: Previous tab
- [ ] Home/End: First/last tab (optional)
- [ ] Enter/Space: Activate focused tab

### Animation & Transitions

- [ ] Content fade/slide transition (150-200ms)
- [ ] Underline animation on active change
- [ ] Smooth color transitions (ease-out)
- [ ] GPU-accelerated (transform, opacity)

---

## shadcn/ui Component Integration

### Tabs Component

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
```

- [ ] Installed and configured
- [ ] Grid layout for triggers
- [ ] Content transitions defined
- [ ] Responsive behavior set
- [ ] Custom styling applied

### Card Component

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
```

- [ ] Used for detail panel sections
- [ ] Padding consistent with design
- [ ] Border/shadow styling

### Accordion Component (Mobile)

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
```

- [ ] Mobile category list
- [ ] Smooth expand/collapse
- [ ] Keyboard accessible
- [ ] Multiple expandable allowed (or single)

### Table Component

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

- [ ] Transaction list table
- [ ] Responsive/mobile-friendly
- [ ] Sortable columns (optional)
- [ ] Hover states

### Badge Component

```tsx
import { Badge } from "@/components/ui/badge"
```

- [ ] Status indicators (on-track, over, under)
- [ ] Color-coded
- [ ] Small size variant

### Progress Component

```tsx
import { Progress } from "@/components/ui/progress"
```

- [ ] Budget progress bars
- [ ] Labeled values
- [ ] Color variants

### Button Component

```tsx
import { Button } from "@/components/ui/button"
```

- [ ] Add category button
- [ ] Edit/delete icons
- [ ] View all transactions link
- [ ] Add transaction button

---

## Custom Components to Build

### BudgetTabsContainer

- [ ] Main wrapper component
- [ ] Manages active tab state
- [ ] Passes selected category to children
- [ ] Responsive tab list rendering
- [ ] Tab content switching logic

### CategoryListPanel

- [ ] Maps over categories array
- [ ] Renders CategoryItem children
- [ ] Handles category selection
- [ ] Search/filter logic (optional)
- [ ] "Add category" button
- [ ] Loading/empty states

### CategoryItem

- [ ] Category name display
- [ ] Quick stats (budget, spent, %)
- [ ] Progress bar component
- [ ] Click handler for selection
- [ ] Visual selection state
- [ ] Subcategory expansion toggle

### CategoryDetailPanel

- [ ] Displays selected category details
- [ ] Header with category name, icon
- [ ] Metrics cards (budget, spent, remaining)
- [ ] Progress visualization
- [ ] TransactionTable component
- [ ] "View All" and "Add" buttons

### TransactionTable

- [ ] Table with headers
- [ ] Transaction rows (5-7 visible)
- [ ] Date, Description, Amount columns
- [ ] Actions column (edit, delete)
- [ ] Hover states
- [ ] Responsive on tablet/mobile

### ProgressIndicator

- [ ] Visual progress bar
- [ ] Percentage text
- [ ] Color-coded (green/yellow/red)
- [ ] Optional label
- [ ] Animated fill

---

## TypeScript Types

- [ ] Category interface
- [ ] Transaction interface
- [ ] BudgetMetrics interface
- [ ] SplitViewState type
- [ ] TabState type
- [ ] CategoryListProps
- [ ] CategoryDetailProps
- [ ] CategoryItemProps
- [ ] TransactionTableProps

---

## State Management

- [ ] Active tab (useState)
- [ ] Selected category (useState)
- [ ] Category list (useState or context)
- [ ] Transaction list (useState or query)
- [ ] Loading state
- [ ] Error state

---

## Output Components

By end of Phase 2B:
- [ ] BudgetTabsContainer (exported)
- [ ] CategoryListPanel (exported)
- [ ] CategoryDetailPanel (exported)
- [ ] TransactionTable (exported)
- [ ] All components with PropTypes/TS
- [ ] Storybook stories for each
- [ ] Basic unit tests
