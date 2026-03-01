# Real-World Examples from Finance Apps

**Document**: Competitive Analysis & Best Practices
**Status**: Research Complete
**Focus**: YNAB, Mint, Quicken, Personal Capital, Actual Budget

---

## 5.1 YNAB (You Need A Budget)

### Desktop Layout

- Horizontal tabs: Budget | Reports | Settings
- Top navigation with sidebar collapsible
- Budget tab shows categories in split-view:
  - Left: Account/category tree
  - Right: Category details, transactions
- Recently updated UI with collapsible top/side bars

### Key Pattern

- Hierarchical navigation (accounts → categories)
- Multi-level sidebar navigation
- Quick stats visible in list view
- Details expanded on selection

### Notable Trade-Off

Users report need to navigate multiple tabs to see full picture. Different info spread across tabs creates friction. Important learning: consolidate related info when possible.

---

## 5.2 Mint (Legacy)

### Desktop Layout

- Clean web interface with easy-to-use dashboard
- Primary: Dashboard (overview cards)
- Secondary: Accounts, Transactions, Budget, Trends
- Transaction register is small compared to YNAB
- Graph-heavy visualizations

### Key Pattern

- Emphasis on overview/dashboard
- Less split-view, more card-based layouts
- Separate views for different data types
- Simpler mental model

---

## 5.3 Quicken

### Desktop Layout

- Account-centric navigation
- Budget view with stacked layout options:
  - Standard: Shows all categories in full height
  - Stacked: Budget above, actual below
  - Graph: Visual representation of over/under budget
- Categories easily customizable
- Split transactions across multiple categories
- Dense table layouts for transaction lists

### Key Pattern

- Account hierarchy critical
- Category grouping with visual status (green/red/gray)
- Flexible layout options for user preference
- High data density acceptable

---

## 5.4 Personal Capital

### Desktop Layout

- Holistic net worth dashboard
- Multi-section tabs: Accounts, Investments, Net Worth, Planning
- Split-view for account details
- Heavy visualization with charts
- Sidebar with quick navigation

### Key Pattern

- Holistic view prioritized
- Detailed drilldowns in split panels
- Chart-heavy data exploration
- Connected financial data (accounts, investments, goals)

---

## 5.5 Actual Budget (Modern Alternative)

### Desktop Layout

- Categories displayed with collapsible groups
- Split-view: Categories list | Category details
- Simple, modern UI
- Monthly view with easy switching
- Transactions displayed inline or in detail panel

### Key Pattern

- Minimalist aesthetic
- Category groups with hierarchy
- Quick visual status (on budget, under, over)
- Modern React-based implementation (similar tech stack)

---

## Key Insights from All Examples

**Common Success Patterns:**
1. Clear category hierarchy with visual status indicators
2. Split-view for desktop (list + detail)
3. Flexible layout options for user preference
4. Dense table layouts acceptable on desktop
5. Smooth transitions between related views

**Common Pitfalls to Avoid:**
1. Spreading critical info across too many tabs (YNAB issue)
2. Transaction registers too small (Mint issue)
3. Overwhelming data density without user controls
4. Unclear category status indicators
5. Poor mobile-to-desktop transitions

---

## Sources

- [YNAB - You Need A Budget](https://www.ynab.com/)
- [Creating a Budget on YNAB Desktop - Page Flows](https://pageflows.com/post/desktop-web/creating-a-budget/ynab/)
- [Quicken Budget Features](https://www.quicken.com/features/manage-your-budget/)
- [Actual Budget Documentation](https://actualbudget.org/docs/budgeting/categories/)
- [CountAbout Personal Finance](https://countabout.com/)
