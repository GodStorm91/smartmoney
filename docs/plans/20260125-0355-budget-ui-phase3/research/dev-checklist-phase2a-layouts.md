# Phase 2A: Layout & Structure Checklist

**Purpose**: Split-view and responsive layout implementation
**Status**: Layout-specific tasks
**Timeline**: 1-2 days

---

## Split-View Layout

### Desktop (1024px+)

- [ ] Grid layout: `grid-cols-[280px_1fr]`
- [ ] Left panel: 280-320px, fixed width, scrollable
- [ ] Right panel: Flexible width, scrollable
- [ ] Divider: 1px border (gray-200)
- [ ] Both scroll independently (overflow-y-auto)
- [ ] Minimum widths enforced: left 280px, right 400px
- [ ] Responsive padding on panels

### Tablet (768px)

- [ ] Left panel: 20% width (icons + abbreviated labels)
- [ ] Right panel: 80% width
- [ ] Icons visible, tooltips on hover
- [ ] Smooth transition from desktop layout
- [ ] Touch-friendly spacing maintained

### Mobile (320px)

- [ ] Accordion/stacked sections
- [ ] No left panel visible
- [ ] Full-width content pane
- [ ] Tap to expand section
- [ ] Single category visible at a time
- [ ] Smooth collapse/expand animation

---

## Tab Navigation Structure

### Horizontal Tabs

- [ ] Tab list: `display: flex`, horizontal layout
- [ ] Tab triggers: 48px height (touch target)
- [ ] Tab padding: 12px 24px
- [ ] Active state: 3px underline (#4CAF50)
- [ ] Inactive: gray-500 or gray-600
- [ ] Hover effect: subtle background change
- [ ] Focus state: 2px outline, visible indicator

### Responsive Tabs

- [ ] Desktop: All tabs visible
- [ ] Tablet: Scrollable if needed
- [ ] Mobile: Hidden (accordion fallback)
- [ ] Smooth show/hide transitions

---

## Category List Panel (Left)

### Structure

- [ ] Category item component
- [ ] Quick stats: budget, spent, % progress
- [ ] Progress bar visual
- [ ] Icon for category type
- [ ] Click to select (dark state)
- [ ] Hover state (subtle highlight)
- [ ] Subcategory expansion (if needed)

### Visual States

- [ ] Default: gray-400 text, light hover
- [ ] Selected: green background, bold text
- [ ] Hover: light gray background
- [ ] Disabled: opacity-60, gray-400
- [ ] Loading: skeleton state
- [ ] Empty: "No categories" message

### Progress Bar

- [ ] Color: Green (<80%), Yellow (80-95%), Red (>95%)
- [ ] Height: 4-6px
- [ ] Background: light gray
- [ ] Animated fill (smooth transition)
- [ ] Optional percentage label

---

## Detail Panel (Right)

### Header Section

- [ ] Category name and icon
- [ ] Key metrics: budget, spent, remaining
- [ ] Percentage progress with label
- [ ] Forecast info (if available)
- [ ] Days remaining in period
- [ ] Edit/delete actions

### Progress Visualization

- [ ] Progress bar (full width)
- [ ] Percentage text overlay or below
- [ ] Color-coded status
- [ ] Remaining amount highlighted
- [ ] Optional visual trend indicator

### Transactions Section

- [ ] Table header: Date, Description, Amount, Actions
- [ ] 5-7 rows visible by default
- [ ] Right-align numeric amounts
- [ ] Hover: highlight row, show actions
- [ ] Actions: edit, delete, view details
- [ ] "View All" button for more transactions
- [ ] "Add Transaction" button

### Responsive Behavior

- [ ] Tablet: Same layout, adjusted font sizes
- [ ] Mobile: Full-width, stacked layout
- [ ] Scrollable transactions section
- [ ] Sticky header (optional)

---

## Tailwind Utilities

- [ ] Grid layout: `grid-cols-[280px_1fr]`, `lg:grid-cols-1`
- [ ] Responsive breakpoints: `lg:`, `md:`
- [ ] Overflow: `overflow-y-auto`
- [ ] Border: `border-r` (divider)
- [ ] Colors: `#4CAF50`, `gray-200`, `gray-400`
- [ ] Spacing: `p-6`, `gap-12`, `py-3 px-6`
- [ ] Transitions: `transition-colors duration-150`

---

## CSS Custom Properties (If Needed)

- [ ] Animation keyframes (slide, fade)
- [ ] Transition timing functions
- [ ] z-index stacking context
- [ ] Media query custom behaviors
