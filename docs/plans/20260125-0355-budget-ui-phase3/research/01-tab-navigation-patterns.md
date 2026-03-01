# Tab Navigation Patterns for Financial Dashboards

**Document**: Tab Navigation Architecture
**Status**: Research Complete
**Focus**: Horizontal vs Vertical tabs, overflow handling

---

## 1.1 Horizontal Tabs (Primary Pattern)

**Best For:**
- Budget overview, spending analysis, forecasts
- 3-5 related sections at top level
- Clear visual hierarchy with active states
- Data that needs frequent switching

**Characteristics:**
- Placed at top of container
- Takes advantage of abundant horizontal screen space
- Familiar interaction pattern (browser-like)
- Active tab typically has underline, background highlight, or elevation
- Works well with cards or panels below

**Implementation Guidelines:**
- Tab triggers should be 44-48px height (minimum touch target)
- Use elevation or shadow on active state to create visual separation
- Active tab indicator (underline, bottom border) 2-3px thick
- Padding: 12-16px horizontal, 12px vertical
- Spacing between tabs: 8-16px
- Max width per tab: 120-200px (depends on label length)

**Financial Dashboard Example:**
```
┌─────────────────────────────────────────┐
│ Overview | Spending | Forecast | Goals │
├─────────────────────────────────────────┤
│ [Dashboard content here]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## 1.2 Vertical Tabs (Secondary Pattern)

**Best For:**
- Settings, configuration panels, multi-step forms
- 6+ category options
- Sidebar navigation style
- When saving horizontal space is priority
- Complex hierarchies (settings, account management)

**Characteristics:**
- Aligned left or right side of container
- Displays more descriptive labels without truncation
- Can accommodate many options without scrolling
- Often paired with icons for visual recognition
- Right-aligned content area uses more space

**Financial Dashboard Example (Settings/Config):**
```
┌──────────────────────────┐
│ Account Settings   │ ... │
│ Budget Rules       │ ... │
│ Category Groups    │ ... │
│ Recurring Items    │ ... │
│ Notifications      │ ... │
│ Export Settings    │ ... │
└──────────────────────────┘
```

---

## 1.3 Tab Overflow Handling (6+ Tabs)

When horizontal tabs exceed available width:

**Option 1: Scrollable Tabs with Arrow Buttons**
- Material UI pattern: scroll left/right buttons
- Clear indication that more tabs exist
- Desktop-preferred approach
- Use `scrollButtons="auto"` behavior

**Option 2: Tab Carousel/Overflow Menu**
- Remaining tabs in dropdown menu
- Icon button with "More" or "…"
- Best when only 1-2 overflow tabs
- Primary tabs visible, secondary in dropdown

**Option 3: Tab Reorganization**
- Group related tabs into sections
- Use nested tabs for hierarchy (max 3 levels)
- Collapse rarely-used tabs into accordion
- Better UX than scrolling long tab bars

**Recommended: Avoid scrollable tabs on desktop** (users don't expect horizontal scrolling)
- If 6+ tabs needed, redesign information hierarchy
- Use vertical tabs instead if horizontal space critical
- Consider multi-level navigation pattern

---

## Sources

- [Tabs UI Design Comprehensive Guide - SetProduct](https://www.setproduct.com/blog/tabs-ui-design)
- [Tabs, Used Right - Nielsen Norman Group](https://www.nngroup.com/articles/tabs-used-right/)
- [Tab Overflow Handling - Medium](https://medium.com/@dipiash/tabs-component-with-scrolling-support-2fbf128c078d)
- [UX Design World - Tab Navigation](https://uxdworld.com/2022/10/05/tabs-navigation-design-best-practices/)
