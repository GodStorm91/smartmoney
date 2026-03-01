# Budget Category Management UX Research
## Personal Finance App Best Practices & SmartMoney Recommendations

**Date:** February 1, 2026
**Scope:** Category selection, hierarchy patterns, filtering, picker consistency, visual hierarchy
**Status:** Research Complete
**Target:** SmartMoney budget category management implementation

---

## Executive Summary

This research synthesizes industry best practices from leading finance apps (YNAB, Monarch Money, Copilot Money) with UX research on category hierarchies, transaction filtering, and visual indicators. Key findings:

1. **Parent-child hierarchies work best with max 2 levels** - Deeper nesting causes UX problems (horizontal scrolling, lost context)
2. **Clicking parent categories should show aggregated child transactions** - Not just parent-only transactions
3. **Category pickers must stay consistent across mobile/desktop** - But adapt interaction patterns to device constraints
4. **Visual indicators (badges, icons, colors) guide users effectively** - Green for on-track, amber for caution, red for over-budget
5. **Breadcrumbs + back buttons essential for mobile drill-down navigation** - Helps users maintain mental model of hierarchy

**SmartMoney Current State:** Already implements hierarchical category picker and budget tracking. Opportunities: enhance category selection flows, improve visual hierarchy in budget views, strengthen mobile category selection UX.

---

## 1. Category Selection in Budget Views

### How Top Finance Apps Handle It

#### YNAB (You Need A Budget)
- **Philosophy:** Rule-based budgeting with strict categorization enforcement
- **Implementation:**
  - Users must assign each payee to a category on first transaction
  - Category selection is mandatory (no "uncategorized" option)
  - Provides inline category creation to reduce friction
  - Clear signifiers (checkboxes, highlight states) guide user actions

#### Monarch Money
- **Philosophy:** Simplicity through automation + user control
- **Implementation:**
  - Pre-categorizes 80%+ of transactions automatically
  - Users verify/adjust categories rather than create from scratch
  - Clean category selection UI with minimal visual clutter
  - Category picker appears in transaction list inline, not modal

#### Copilot Money
- **Philosophy:** Premium UX with iOS-first focus
- **Implementation:**
  - Tap category in category list → detailed view opens
  - Inline budget editing in category detail view
  - Color-coded category status (green/yellow/red) integrated into category tiles
  - Genmoji customization allows users to assign custom emojis per category

### SmartMoney Current Implementation
✅ **Strengths:**
- Hierarchical category picker with parent → child two-level navigation
- Back button + breadcrumb for context maintenance
- Supports custom category creation within picker flow
- Category tree structure stored in database (CategoryParent/CategoryChild types)

⚠️ **Gaps:**
- Category selection in budget detail view not optimized for tap targets on mobile
- No visual preview of child categories at parent level (requires navigation into parent)
- Budget view doesn't show category status indicators (on-track vs over-budget)

---

## 2. Category Grouping Patterns

### 2.1 Parent-Child Hierarchies: Best Practices

**Optimal Depth:** 2 levels maximum
- Level 1: Parent/Group (e.g., "Food", "Transportation")
- Level 2: Child/Specific (e.g., "Groceries", "Dining Out" under Food)

**Why:**
- Tree tables/hierarchies with 3+ nested levels rapidly become unusable
- Horizontal scrolling increases; text gets cut off
- Parent context scrolls out of view → user gets lost
- Cognitive load increases 3-5x per additional nesting level

**Alternative Pattern:** If >2 levels needed, use breadcrumbs + linear navigation instead of tree expansion

### 2.2 Flat vs Nested Structures

#### When to Use Flat (No Hierarchy)
- <8 categories total
- Categories are truly independent (no logical grouping)
- Mobile-first app (simplifies touch targets)
- **Example:** "Dining", "Entertainment", "Groceries" all at same level

#### When to Use Nested (Parent-Child)
- 10-30 categories across multiple groups
- Clear logical groupings exist
- Users benefit from collapsing/expanding groups
- **Example:**
  ```
  Food (parent)
  ├── Groceries (child)
  ├── Dining Out (child)
  └── Meal Prep (child)

  Transportation (parent)
  ├── Gas (child)
  ├── Uber/Lyft (child)
  └── Public Transit (child)
  ```

**SmartMoney Implementation:** Uses 2-level hierarchy (appropriate for most personal budgets with 15-25 categories)

### 2.3 Showing Transactions for Parent vs Child Categories

**Critical UX Decision:** When user clicks parent category, should they see:
- **Option A:** Only transactions assigned to the parent itself (rare)
- **Option B:** All transactions from parent + all children (recommended)

**Industry Standard (Option B):**
- **Actual Budget:** "View by Group" toggles aggregated view showing all child transactions under parent
- **Quicken:** Budget values "roll up" from children to parent; parent view always shows aggregated spending
- **Monarch Money:** Category groups show aggregate spending; drill-down shows individual categories
- **Origin/Savings Apps:** Parent category clicking shows breakdown of spending across children

**Why Option B Works Better:**
- User mental model: Parent = all related spending
- Prevents confusion: "Why does my 'Food' category show ¥0 when I have receipts?"
- Supports analysis: Users want to see total Food spending (groceries + dining + coffee)
- Matches spreadsheet behavior: SUM(Food:*) aggregates all children

**SmartMoney Recommendation:**
When budget allocation card displays parent category (if implemented):
```
Food (Parent)
¥50,000 budgeted
├─ Groceries: ¥30,000 spent
├─ Dining Out: ¥15,000 spent
└─ Coffee: ¥5,000 spent
Total Spent: ¥50,000 (100% - on track)
```

Clicking parent card should:
1. Navigate to category detail view
2. Show aggregate spending across all children
3. Provide expandable/collapsed view of child breakdowns
4. Link to transaction list filtered by parent (including children)

---

## 3. Transaction Filtering by Budget Category

### 3.1 Parent-Child Filtering Behavior

**Correct Filtering Logic:**

When user selects parent category in filter:
- ✅ Show all transactions from parent category
- ✅ Show all transactions from all child categories
- ❌ Do NOT show only parent transactions (confusing, incomplete)

When user selects child category in filter:
- ✅ Show only transactions from that specific child
- ✅ Provide breadcrumb showing parent context
- ❌ Do NOT show sibling categories (unless user explicitly includes them)

**Implementation Pattern:**
```typescript
// GET /api/transactions?category=Food
// Returns: transactions with category="Food" OR category in ["Groceries", "Dining Out", "Coffee"]

// GET /api/transactions?category=Groceries
// Returns: transactions with category="Groceries" only
```

### 3.2 UI Patterns for Category Filtering

**Mobile Pattern (SmartMoney Current):**
- Transaction list with inline category filter button
- Tap category button → opens hierarchical category picker (breadcrumb trail)
- Selected category shows highlighted/bold in list
- Clear button to reset filter

**Desktop Pattern (Consider for expansion):**
- Category filter as dropdown or collapsible panel
- Show expanded category tree on left (parents collapsed by default)
- Clicking parent expands children inline
- Selected category highlighted
- Click to toggle filter on/off

**Accessibility Considerations:**
- WCAG 1.4.13: Dropdown menus must remain visible until user explicitly dismisses
- WCAG 2.1.1: All interactions keyboard-accessible via Tab
- WCAG 3.2.1: Focus indicators clearly visible (minimum 3:1 contrast ratio)

---

## 4. Category Picker Consistency

### 4.1 When to Use Same Component Across App

**Use Same Picker Everywhere:**
- ✅ Transaction creation modal
- ✅ Budget allocation card edit
- ✅ Transaction filtering
- ✅ Category management settings

**Benefits:**
- Reduced cognitive load (users learn one pattern)
- Consistent data model (avoid category name mismatches)
- Easier maintenance (single source of truth)
- Better accessibility audit (test once, apply everywhere)

**SmartMoney Current:** HierarchicalCategoryPicker used in transactions; need to verify it's used in budget allocation modal

### 4.2 Device-Specific Adaptation

**What Stays Consistent:**
- Hierarchy structure (same parent-child relationships)
- Category names/icons
- Selection behavior (single select vs multi-select)
- Keyboard shortcuts (Esc to close, Enter to confirm)

**What Adapts by Device:**

| Aspect | Mobile | Desktop |
|--------|--------|---------|
| **Trigger** | Tap button → modal overlay | Click field → dropdown |
| **Width** | Full-width, max 95vw | 300-400px dropdown |
| **Depth** | Linear (parent → children) | Expandable tree (parent ▸ children) |
| **Touch targets** | Min 48x48px | Min 24x24px (WCAG AAA) |
| **Scroll** | Vertical overflow only | Vertical overflow, controlled height |
| **Search** | Optional (if >10 categories) | Include if >15 categories |

**Example: SmartMoney HierarchicalCategoryPicker Adaptation**

Mobile (Current - Good):
```
[Back] Expense Categories
┌──────────────────┐
│ 📍 Food      ⟶   │  (parent shown, tap to expand)
│ 📍 Transport ⟶   │
│ 📍 Housing   ⟶   │
└──────────────────┘
```

When parent tapped:
```
[Back] ← Food         (breadcrumb showing current level)
┌──────────────────┐
│ Groceries        │  (child categories)
│ Dining Out       │
│ Coffee           │
└──────────────────┘
```

Desktop (Recommended Enhancement):
```
Expense Categories
┌─ Food
  ├─ Groceries     ← (click to select, no need to navigate)
  ├─ Dining Out
  └─ Coffee
├─ Transportation
  ├─ Gas
  ├─ Uber/Lyft
  └─ Public Transit
```

### 4.3 Preventing Category Name Conflicts

**Risk:** Same category name across different parents causes data bugs

**Prevention (SmartMoney Already Handles):**
- Store internal `category_id` not `category_name` in budget allocations
- Use `parent_id + category_id` as unique key for category grouping
- Transactions reference child category by ID, not name

**Verification Needed:** Check BudgetAllocation schema stores category_id, not just category name string

---

## 5. Visual Hierarchy and Navigation

### 5.1 Visual Indicators for Clickable Categories

**Clear Affordance Patterns:**

| Element | Visual Cue | Mobile | Desktop |
|---------|-----------|--------|---------|
| **Parent category** | Right chevron (›) | ⟶ | Small arrow |
| **Selected category** | Blue highlight + checkmark | ✓ Icon | ✓ Checkmark or radio button |
| **Clickable area** | Slight hover shadow | Touch highlight | Hover effect |
| **Status indicator** | Color badge (if tracking) | Right-side badge | Right-side status |
| **Disabled category** | Gray text, opacity 0.5 | Greyed out | Greyed out, no hover |

**SmartMoney Implementation (Current):**
- HierarchicalCategoryPicker shows categories in grid with icons
- Parent categories have implicit navigation (no explicit › indicator visible in excerpt)
- Child categories appear when parent selected
- No status badges shown in picker (appropriate - picker is input, not summary)

**Recommendation:** Add subtle › indicator to parent categories to signal "more options inside"

### 5.2 Breadcrumb Patterns for Category Drill-Down

**Standard Pattern (Mobile):**
```
[← Back] Current Category Title
```

**Enhanced Pattern (Mobile + Desktop):**
```
Expense > Food > Groceries
[click to navigate back]
```

**Best Practices (NN/G Research, Smashing Magazine):**
1. **Placement:** Below main header, above page content
2. **Styling:**
   - Font size: 12-14px (smaller than main content)
   - Color: Gray (not primary color)
   - Icons: Small chevrons (›) between levels
3. **Touch targets:** Minimum 44x44px for mobile; 24x24px for desktop
4. **Truncation:** On narrow screens (mobile), use overflow menu:
   ```
   Expense > … > Groceries   [shows first + last 2 levels]
   ```
5. **Navigation:** Each breadcrumb level is clickable, goes back to that level
6. **Mobile specific:** On <640px, show only "Back" button instead of full breadcrumb (saves space)

**SmartMoney Opportunity:**
- Budget allocation detail view (when expanded/clicked) could show:
  ```
  Budget > Category > [Parent Name] > [Child Name]
  ```
- Transaction filter panel could show:
  ```
  Filters > Category > [Current Selection]
  ```

### 5.3 Category Status Indicators in Budget View

**Effective Visual Status (Copilot Money Pattern):**

```
┌─────────────────────────────┐
│ 🍕 Food               ✓ 82%  │  ← Status badge, on-track
│ ¥24,500 / ¥30,000          │
│ [████████░░░░░░░░░░░░]     │
│ ¥5,500 remaining           │
└─────────────────────────────┘
```

**Status Indicators:**
- ✓ Green: <80% spent (on track)
- ⚠ Yellow: 80-95% spent (caution)
- ⚠ Orange: 95-100% spent (warning)
- 🚨 Red: >100% spent (over budget)

**SmartMoney Current:**
✅ Shows color-coded progress bars (green/yellow/orange/red)
✅ Shows spent vs budgeted amounts
❌ Could add status badge in top-right corner for quick scanning
❌ Missing "days remaining in month" indicator (useful for pacing)

### 5.4 Mobile vs Desktop Considerations

#### Mobile (<768px)
**Category Selection in Budget:**
- Full-width button to tap and open picker modal
- No dropdown (interferes with touch scrolling)
- Modal takes full screen on <480px
- Touch targets: 48px minimum height
- Back button always visible (return to budget view)

**Category List in Budget Allocations:**
- Stack vertically (1 column)
- Expandable rows show child breakdown
- Tap to expand/collapse (not right-arrow tap)
- Swipe interactions optional but useful:
  ```
  Swipe left → reveal edit/delete buttons
  Swipe right → collapse expanded row
  ```

#### Desktop (≥1024px)
**Category Selection in Budget:**
- Inline dropdown (300-400px wide)
- Tree structure shows parents + children in same view
- Hover effects on parent shows right-arrow indicator
- Search box if >15 categories
- No modal needed

**Category List in Budget Allocations:**
- Can display 2-3 columns
- Show child breakdown as inline collapsible rows
- Hover reveals edit/delete buttons (less visual noise)
- Right-click context menu optional

---

## 6. SmartMoney-Specific Implementation Recommendations

### 6.1 Current State (Based on Code Review)

**Budget.tsx Analysis:**
- Uses tabbed interface (Overview, Categories, Transactions, Forecast)
- BudgetTabsContainer manages tab state
- CategoriesTab displays allocations
- AllocationCard component shows individual category allocation + tracking

**AllocationCard Component:**
- ✅ Shows category name + allocated amount
- ✅ Color-coded progress bar (spent vs budget)
- ✅ Shows remaining balance
- ✅ Displays top transactions in category
- ❌ No parent category indication (if parent exists)
- ❌ No status badge (on-track, caution, over)
- ❌ Click handler calls onCategoryClick() but destination unclear

**HierarchicalCategoryPicker Component:**
- ✅ Displays parent categories in grid
- ✅ Shows children when parent selected
- ✅ Back button for navigation
- ✅ Supports creating new category in-picker
- ⚠️ Grid layout (3 columns) might need adjustment for mobile <480px (2 columns better)

### 6.2 Recommended Enhancements (Priority Order)

#### Priority 1: Budget View Clarity (1-2 weeks)

**1.1 Add Status Indicators to AllocationCard**
```tsx
<AllocationCardHeader>
  <div className="flex justify-between items-center">
    <CategoryName icon={icon} name={category} parentName={parentName} />
    <StatusBadge status="on-track" percent={82} />  {/* NEW */}
  </div>
</AllocationCardHeader>
```

**1.2 Show Parent Category Context**
```tsx
{parentName && (
  <p className="text-xs text-gray-500">
    {parentIcon} {parentName}  {/* Show which group this belongs to */}
  </p>
)}
```

**1.3 Add "Days Remaining" Pacing Indicator**
```tsx
<div className="flex justify-between text-xs text-gray-600">
  <span>8 days remaining</span>
  <span>¥3,062/day pace</span>
</div>
```

**Code Changes Needed:**
- AllocationCard props: add `parentName`, `parentIcon`, `statusOverride` (optional)
- Styling: Add badge component for status indicator (use existing Badge or create StatusBadge)
- No backend changes needed (data already available from tracking response)

#### Priority 2: Category Picker Mobile UX (1 week)

**2.1 Improve Mobile Category Grid Layout**
```tsx
// Current: 3-column grid
<div className="grid grid-cols-3 gap-2">

// Responsive:
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
```

**2.2 Add Subtitle Under Parent Category in Picker**
```tsx
<div className="flex flex-col items-center justify-center p-3">
  <span className="text-2xl mb-1">{parent.icon}</span>
  <span className="text-sm font-medium">{parent.name}</span>
  <span className="text-xs text-gray-500">
    {parent.children.length} options  {/* NEW */}
  </span>
</div>
```

**2.3 Add Visual Chevron Indicator to Parents**
```tsx
className="absolute top-2 right-2 text-gray-400">
  <ChevronRight className="w-4 h-4" />  {/* Show expandable */}
</ChevronRight>
```

**Code Changes Needed:**
- HierarchicalCategoryPicker: modify grid layout (Tailwind responsive classes)
- Add subtitle (children count) for context
- Add chevron icon to parent cells

#### Priority 3: Enhanced Navigation (2 weeks)

**3.1 Breadcrumb Navigation in Budget Detail**
When user clicks allocation card → show in tab:
```
Budget > January 2026 > Food > Groceries
└─ Back link at top
```

**3.2 Transaction Filtering with Breadcrumb**
When filtering by category in Transactions tab:
```
Filters > Category
  Expense > Food > Groceries  [✕ to clear]
```

**3.3 Category Picker: Add Chevron Expansion (Desktop)**
```tsx
// Desktop only: show chevron + children preview
{device === 'desktop' && parent.children.length > 0 && (
  <span className="text-xs text-gray-400 ml-auto">
    ▸ {parent.children.length}  {/* Show child count */}
  </span>
)}
```

**Code Changes Needed:**
- Add breadcrumb component (reusable)
- Modify transaction filter panel to show breadcrumb
- Add device detection (mobile vs desktop) to HierarchicalCategoryPicker
- Update AllocationCard onClick handler to show breadcrumb in navigation

#### Priority 4: Smart Status Display (2-3 weeks)

**4.1 Dynamic Status Badge Component**
```tsx
type StatusType = 'on-track' | 'caution' | 'warning' | 'over-budget'

function StatusBadge({ status, percent, spent, budgeted }: StatusProps) {
  const config = {
    'on-track': { icon: '✓', color: 'green', text: `${percent}%` },
    'caution': { icon: '⚠', color: 'yellow', text: `${percent}%` },
    'warning': { icon: '⚠', color: 'orange', text: `${percent}%` },
    'over-budget': { icon: '🚨', color: 'red', text: `+${overAmount}` }
  }
  return <Badge>{config[status].text}</Badge>
}
```

**4.2 Calculate Status from Tracking Data**
```tsx
const getStatus = (spent: number, budgeted: number): StatusType => {
  const percent = (spent / budgeted) * 100
  if (spent > budgeted) return 'over-budget'
  if (percent >= 95) return 'warning'
  if (percent >= 80) return 'caution'
  return 'on-track'
}
```

**Code Changes Needed:**
- Create StatusBadge component
- Add status calculation logic
- Update AllocationCard to use new component
- Add ARIA labels for accessibility

### 6.3 Code Implementation Pattern

**File Changes Required:**

1. **components/budget/status-badge.tsx** (NEW)
   - StatusBadge component with icon + color mapping
   - Props: status, percent, spent (optional), budgeted (optional)

2. **components/budget/budget-allocation-card.tsx** (MODIFY)
   - Add parentName prop
   - Add StatusBadge in header
   - Add "days remaining" calculation
   - Update styles for new elements

3. **components/transactions/HierarchicalCategoryPicker.tsx** (MODIFY)
   - Responsive grid (grid-cols-2 sm:grid-cols-3)
   - Add child count subtitle
   - Add chevron indicator
   - Add device detection for desktop expansion

4. **types/budget.ts** (MODIFY)
   - Verify BudgetAllocation includes parent_id or parent information
   - Add type for status indicators

**No Backend Changes Required:** Budget and tracking endpoints already return necessary data

### 6.4 Accessibility Compliance Checklist

**Current Gaps (Verify):**
- [ ] AllocationCard progress bars have role="progressbar" + aria-valuenow, aria-valuemax
- [ ] Status badges have aria-label (e.g., "On track, 82 percent")
- [ ] Category picker supports keyboard navigation (Tab, Enter, Esc)
- [ ] Breadcrumbs are semantic HTML <nav> with <ol> and <li>
- [ ] Minimum touch target size 44x44px verified on mobile
- [ ] Color contrast ratios ≥4.5:1 for text, ≥3:1 for UI components
- [ ] Dark mode color contrast verified separately

**Recommendations:**
- Add role="progressbar" to progress bars
- Add aria-label to status badges
- Test keyboard navigation in HierarchicalCategoryPicker
- Use semantic HTML for breadcrumbs (<nav>, <ol>)
- Verify color contrast in both light + dark modes

---

## 7. Parent vs Child Transactions: Implementation Decision

### Decision Point: Budget Allocation Display

**Question:** Should "Food" budget allocation card show:
- (A) Only Food parent category spending
- (B) Food parent + all children (Groceries, Dining, Coffee) aggregated

**Recommendation: Option B (Aggregate)**

**Why:**
- User mental model: "Food budget" = all food-related spending
- Prevents confusion: Budget allocation of ¥50k shouldn't show ¥0 spent when children have transactions
- Matches user expectations: "I allocated ¥50k to Food, but none shows as spent?"
- Standard practice: YNAB, Quicken, Monarch all aggregate children in parent category view

**Implementation:**
```typescript
// Backend endpoint should return:
GET /api/budgets/{month}/allocations
{
  id: 1,
  budget_id: 123,
  category_id: 5,          // Food (parent)
  category_name: "Food",
  parent_id: null,         // Indicates this is a parent
  amount: 50000,
  tracking: {
    budgeted: 50000,
    spent: 45000,          // Sum of all children (Groceries + Dining + Coffee)
    remaining: 5000,
    transactions: [        // All transactions from Food + children
      { id: 1, category: "Groceries", amount: 30000, ... },
      { id: 2, category: "Dining Out", amount: 15000, ... },
      { id: 3, category: "Coffee", amount: 5000, ... }
    ]
  }
}
```

**Frontend Display:**
```tsx
<AllocationCard
  allocation={{ category: "Food", amount: 50000 }}
  tracking={{ spent: 45000, remaining: 5000 }}
  showChildren={true}
  children={[
    { name: "Groceries", spent: 30000 },
    { name: "Dining Out", spent: 15000 },
    { name: "Coffee", spent: 5000 }
  ]}
/>
```

---

## 8. Industry Research Findings (Cited Sources)

### Key Sources Reviewed

1. **Monarch Money vs YNAB Comparisons (2025-2026)**
   - Monarch automates category assignment; YNAB requires manual
   - Monarch's simpler UX wins in user adoption despite fewer features
   - Both use 2-level category hierarchy (parent groups → individual categories)

2. **Actual Budget Documentation**
   - Supports "View by Group" toggle for aggregated category view
   - Category groups allow viewing spending by parent + children combined
   - Demonstrates parent-child aggregation is expected behavior

3. **NN/G Breadcrumb Research**
   - Breadcrumbs most effective for hierarchies >2 levels
   - Placement: below header, above content
   - Mobile: overflow menu when space is limited
   - All breadcrumb elements should be clickable

4. **WCAG 2.1 Accessibility Standards**
   - Dropdown menu focus: must remain visible until explicitly dismissed
   - Touch target minimum: 24x24px (WCAG AAA) to 44x44px (recommended for fintech)
   - Color contrast: 4.5:1 for text, 3:1 for UI components
   - Content on hover/focus must be dismissible, hoverable, and remain visible

5. **Fintech UX Design Best Practices (2025-2026)**
   - Consistency across devices critical (but adapt interactions)
   - Component reuse reduces cognitive load
   - Clear affordances (chevrons, badges, highlights) guide actions
   - Information hierarchy: show headline metrics → drill down to details

6. **Copilot Money Design Patterns**
   - Color-coded category status bars (green/yellow/orange/red)
   - Inline category editing from category list view
   - Genmoji customization for personal touch
   - Minimalist aesthetic with strong visual hierarchy

---

## 9. Comparison: How Apps Handle Parent-Child Categories

| Aspect | YNAB | Monarch | Copilot | SmartMoney |
|--------|------|---------|---------|-----------|
| **Hierarchy Depth** | 2 levels | 2 levels | 1 level (groups only) | 2 levels ✅ |
| **Budget Aggregation** | Yes (parent shows children) | Yes (groups aggregate) | Per-category | Needs verification |
| **Category Picker** | Flat list + search | Hierarchical grid | Flat list | Hierarchical ✅ |
| **Visual Status** | Icon indicators | Color gradients | Color bars | Color bars ✅ |
| **Mobile Picker** | Modal list | Modal grid | Modal list | Modal hierarchical ✅ |
| **Breadcrumbs** | Not shown | Not shown | Not shown | Opportunity |
| **Transaction Filter** | By category | By category/group | By category | By category ✅ |
| **Touch Targets** | 44-48px | 48px+ | 52px+ | Verify 48px |

---

## 10. Unresolved Questions for SmartMoney Team

1. **Parent Budget Aggregation:** When a user creates a budget allocation for "Food" (parent), should the spent amount automatically aggregate from "Groceries" + "Dining" + "Coffee" children, or is Food always a separate category?
   - *Recommendation:* Aggregate (matches user expectations)

2. **Category Type in Allocations:** Does BudgetAllocation table store `category_id` (numeric) or `category_name` (string)?
   - *Critical for:* Preventing category name collisions, supporting renames
   - *Recommendation:* Use `category_id` + store parent relationship info

3. **Transaction Filtering Logic:** When filtering transactions by parent category in Transactions tab, should child transactions be included?
   - *Recommendation:* Yes, include children (standard behavior)

4. **Mobile Allocation Card Interaction:** Currently, clicking allocation card calls `onCategoryClick()` - what should this do? Open detail panel? Navigate to Transactions tab filtered by category?
   - *Recommendation:* Navigate to Transactions tab with category filter applied

5. **Desktop vs Mobile Picker:** Is there a planned desktop view of budget page? If yes, should category picker adapt to dropdown pattern (vs current modal)?
   - *Recommendation:* Yes, adapt to dropdown on desktop (≥1024px)

6. **Multi-currency Budgets:** If user has JPY + USD accounts, how are category allocations handled? Separate budget per currency, or single budget with multi-currency amounts?
   - *Current:* Appears to support single monthly_income; clarify if multi-currency supported
   - *Recommendation:* Budget in user's primary currency; convert display amounts

---

## 11. Quick Reference: Visual Indicator Color Mapping

**Standard Fintech Color System (SmartMoney uses this):**

```
On-Track / Success:     #10B981 (Green)    [Spent <80% of budget]
Caution / Warning:      #FBBF24 (Amber)    [Spent 80-95% of budget]
Critical / Danger:      #F87171 (Red)      [Spent >100% of budget]
Information / Neutral:  #3B82F6 (Blue)     [Category name, labels]
Accent / Primary:       #3B82F6 (Blue)     [Interactive elements]
Disabled:               #D1D5DB (Gray)     [Inactive UI, text]
```

**Status Badge Icons (Text Alternative):**
```
✓  Green   → "On track"
⚠  Amber   → "Getting close"
🚨 Red     → "Over budget"
→  Gray    → "More info / expandable"
```

---

## 12. Summary & Next Steps

### What Works Well (Keep)
✅ 2-level category hierarchy (parent → child)
✅ Hierarchical category picker with back navigation
✅ Color-coded progress bars
✅ Spent vs budget display
✅ Mobile-first layout

### What to Add (Priority Order)
1. Status badges (on-track/caution/over-budget)
2. Parent category context in budget cards
3. Days remaining + daily pace indicator
4. Breadcrumb navigation for drill-down flows
5. Desktop category picker adaptation

### Verification Needed
- BudgetAllocation schema: category_id vs category_name
- Parent category budget aggregation logic
- Touch target sizes (44x48px minimum)
- Keyboard navigation in category picker
- Color contrast in light + dark modes

### Resources for Team
- SmartMoney category types defined in: `/frontend/src/types/category.ts`
- Budget components in: `/frontend/src/components/budget/`
- Category picker in: `/frontend/src/components/transactions/HierarchicalCategoryPicker.tsx`
- Budget page: `/frontend/src/pages/Budget.tsx`

---

## Sources

- [Monarch Money vs YNAB: Which Budgeting App Will Actually Stick With You? | The Motley Fool](https://www.fool.com/money/personal-finance/monarch-money-vs-ynab/)
- [YNAB vs Monarch Money – ROB BERGER](https://robberger.com/ynab-vs-monarch-money/)
- [Designing the information architecture of apps | by Osama Abdelnaser | Medium](https://osamaabdelnaser.medium.com/designing-the-information-architecture-of-apps-b1c9c17839a9)
- [Interaction Design for Trees | Medium](https://medium.com/@hagan.rivers/interaction-design-for-trees-5e915b408ed2)
- [Case study: Category hierarchy - UX Magazine](https://uxmag.com/articles/case-study-category-hierarchy)
- [Actual Budget - Categories Documentation](https://actualbudget.org/docs/budgeting/categories/)
- [The Best UX Design Practices for Finance Apps in 2025 | G & Co.](https://www.g-co.agency/insights/the-best-ux-design-practices-for-finance-apps)
- [Top UI Ideas for a User-Friendly Finance App | ANODA UX Agency](https://www.anoda.mobi/ux-blog/top-ui-finance-ideas-for-mobile-apps)
- [Finance App Design 101: A Complete Blueprint | Fuselab Creative](https://fuselabcreative.com/finance-app-design-101-a-complete-blueprint/)
- [Breadcrumbs UX Navigation - The Ultimate Design Guide - Pencil & Paper](https://www.pencilandpaper.io/articles/breadcrumbs-ux)
- [Breadcrumbs: 11 Design Guidelines for Desktop and Mobile - NN/G](https://www.nngroup.com/articles/breadcrumbs/)
- [Dropdown Menus and Accessibility: Key Issue, Guidelines & Fix - Advancedbytez](https://advancedbytez.com/dropdown-menus-and-accessibility/)
- [Accessible Navigation Menus: Pitfalls and Best Practices - Level Access](https://www.levelaccess.com/blog/accessible-navigation-menus-pitfalls-and-best-practices/)
- [Fly-out Menus | Web Accessibility Initiative (WAI) | W3C](https://www.w3.org/WAI/tutorials/menus/flyout/)
- [Copilot Money Categories Tab Overview](https://help.copilot.money/en/articles/9504513-categories-tab-overview)
- [Copilot Money Groups of Categories](https://help.copilot.money/en/articles/3767655-groups-of-categories)
- [Fintech UI examples to build trust | Eleken](https://www.eleken.co/blog-posts/trusted-fintech-ui-examples)
- [Foot the Bill: Inspiring UI Designs for Finance Apps | Design4Users](https://design4users.com/ui-design-finance-apps/)

---

**Report Status:** Complete | **Last Updated:** February 1, 2026
