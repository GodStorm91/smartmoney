# Best Practices & Unresolved Questions

**Document**: Summary & Future Considerations
**Status**: Research Complete
**Focus**: Best practices checklist, unresolved items for implementation

---

## 7.1 UX Best Practices

1. **Keep Tabs Shallow**: Max 5-6 top-level tabs
2. **Clear Visual States**: Active tab must be unmistakable
3. **Predictable Behavior**: Switching tabs doesn't lose user context
4. **Keyboard Accessible**: Tab/Arrow keys work intuitively
5. **Responsive First**: Design mobile → scale up to desktop
6. **Label Clarity**: Tab labels should be 1-2 words, clear intent
7. **Icon Usage**: Icons + text for visual recognition
8. **Smooth Transitions**: Content changes feel responsive (no jarring jumps)

---

## 7.2 Design System Alignment (SmartMoney)

**Colors:**
- Use primary green (#4CAF50) for active tabs
- Inactive tabs: gray-500 or gray-600

**Typography:**
- Tab labels: 14px (medium weight), not bold
- Body text: 16px on mobile, 14-16px on desktop

**Spacing:**
- 8px grid maintained (12-24px padding)
- Card padding: 24px (p-6)
- Section gap: 48px (gap-12)

**Animations:**
- Transitions: 150-250ms ease-out
- Smooth scroll enabled
- Respect prefers-reduced-motion

**Accessibility:**
- WCAG AA contrast (4.5:1)
- ARIA labels on all interactive elements
- Focus indicators visible
- Touch targets ≥ 44x44px

---

## 7.3 Mobile-First Responsive Pattern

```
Mobile (320px):   Accordion / Bottom tab bar
Tablet (768px):   Horizontal scrollable tabs
Desktop (1024px): Fixed horizontal tabs + split view
```

**Key Principle**: Design for smallest screen first, enhance for larger screens.

---

## 7.4 Data Density Optimization

### Desktop Information Density

- Desktop: 2-3x more info than mobile (acceptable)
- Typography: Body 14-16px, labels 12-13px (reduced)
- Spacing: 8px grid minimum (no less)
- Progressive Disclosure: "More" menu for secondary actions
- User Control: Compact/Comfortable/Spacious view toggle

### Comfortable Density Ratios

- Desktop: 65-70% fill rate (not 100% packed)
- Mobile: 40-50% fill rate (generous whitespace)
- Tablet: 55-60% fill rate (balanced)

---

## 7.5 Technical Stack Recommendations

### React Components (shadcn/ui)

- **Tabs**: Primary navigation (horizontal)
- **Sidebar**: Category list (left panel)
- **Card**: Detail sections, information containers
- **Accordion**: Mobile fallback, collapsible sections
- **Table**: Transaction lists (data-dense)
- **Select/Dropdown**: Filters, sorting
- **Badge**: Status indicators (on-track, over-budget, etc.)

### Styling

- **Tailwind CSS**: Grid, flexbox, responsive
- **Radix UI**: Accessibility primitives under shadcn/ui
- **CSS Grid**: Split-view layout (`grid-cols-[280px_1fr]`)
- **Media Queries**: Breakpoints 768px, 1024px

### State Management

- React hooks (`useState`, `useCallback`, `useMemo`)
- URL state for tab selection (shareable links)
- localStorage for user preferences (split view ratio, view mode)

### Performance Considerations

- Lazy load tab content (not all tabs rendered initially)
- Virtual scrolling for long transaction lists
- Memoize category list to avoid unnecessary re-renders
- Pagination or infinite scroll for transactions

---

## 7.6 Unresolved Questions

### UX/Design Questions

1. **Split View Resizing**: Should users be able to resize left/right panels? (increases complexity, improves customization)
2. **Tab Persistence**: Should active tab be remembered across sessions? (use localStorage)
3. **Category Grouping**: How many levels of category nesting? (2-3 recommended, not more)

### Mobile-Specific Questions

4. **Mobile Tab Navigation**: Bottom tab bar vs full-screen accordion? (bottom bar more mobile-native)
5. **Mobile Swipe**: Should users swipe to navigate categories? (improves mobile feel)

### Data & Performance Questions

6. **Real-Time Updates**: If budget is updated elsewhere, how quickly should categories list update? (polling vs WebSocket)
7. **Performance Baseline**: What's acceptable load time for category detail panel with 100+ transactions?
8. **Tab Overflow**: At what point (number of categories) should we switch from split-view to vertical sidebar navigation?

### Testing & Refinement

9. **Accessibility Testing**: Need formal WCAG AA audit for final implementation
10. **Dark Mode**: Tab styling adjustments needed? (contrast, borders, shadows)
11. **Data Export**: How should split view adapt if exporting/printing? (single-column fallback)

---

## 7.7 Next Steps

1. **Review this research** with design team
2. **Create wireframes** using findings from sections 1-5
3. **Validate with prototypes** on actual screens (mobile, tablet, desktop)
4. **Implement component** using guide in section 6
5. **Conduct accessibility audit** (WCAG AA)
6. **Gather user feedback** before finalizing
7. **Document final patterns** in design system

---

## Sources

- [Fintech Design Guide 2026 - Eleken](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- [Dashboard Design Principles 2026 - DesignRush](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-design-principles)
- [Tabs UX Best Practices - Eleken](https://www.eleken.co/blog-posts/tabs-ux)
- [WCAG AA Accessibility Standards](https://www.w3.org/WAI/WCAG2AA-Conformance)
