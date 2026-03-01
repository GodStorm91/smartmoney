# Budget UI/UX Quick Checklist & Decision Guide

**Purpose:** Fast reference for implementation decisions
**Use When:** Starting a task or reviewing code

---

## ⚡ Quick Decision Matrix

### "Should I use X chart for Y data?"

| Data Type | Best Chart | Why | Don't Use |
|-----------|-----------|-----|----------|
| Allocated vs Remaining | Donut | Binary, efficient | Pie chart (wastes space) |
| Spending 6+ categories | Horizontal Bar | Rankable | Pie/Donut (cluttered) |
| Spending over time | Area/Line | Trend visible | Pie chart (can't show trend) |
| Current vs Budget | Progress Bar | Clear comparison | Chart (overkill) |
| Budget health status | Color Badge | Instant recognition | Numbers alone |

---

## 📱 Responsive Breakpoint Reminders

```
Mobile (default)  → <640px  → Stack vertically
Tablet           → 640-1023px → 2 columns
Desktop          → ≥1024px    → 3+ columns + sidebar

Test these widths: 320px, 640px, 768px, 1024px, 1200px
```

---

## 🎨 Color State Cheat Sheet

```
Amount < 60% allocated     → GREEN    ✓ On track
Amount 60-80% allocated    → YELLOW   ⚡ Caution
Amount 80-95% allocated    → AMBER    ⚠️  Warning
Amount >95% allocated      → AMBER    ⚠️  Almost full
Amount >100% allocated     → RED      🚨 Over budget

Exception: Show all 4 states on progress bar (smooth gradient)
Always pair color with: icon + label + number
```

---

## ✅ Component Checklist

Before submitting code, verify each component has:

- [ ] **Props:** TypeScript interface defined
- [ ] **States:** Hover, focus, active, disabled all styled
- [ ] **Responsive:** Works at 320px, 768px, 1024px
- [ ] **Accessibility:** ARIA labels present, keyboard navigable
- [ ] **Dark Mode:** Colors scale correctly with `dark:` prefix
- [ ] **Error State:** Shows gracefully if data missing
- [ ] **Loading State:** Shows spinner or skeleton
- [ ] **Tests:** Unit tests for logic, component renders correctly

---

## 🔍 Code Review Checklist

When reviewing Phase 1 PRs, check:

- [ ] **Clarity First:** Can someone unfamiliar understand it immediately?
- [ ] **Mobile Tested:** Scrolls properly, no horizontal overflow at 320px
- [ ] **ARIA Labels:** Dynamic content has aria-live regions
- [ ] **Performance:** No unnecessary re-renders, memoization where needed
- [ ] **Consistency:** Uses existing color/spacing/font system
- [ ] **Tests:** 80%+ coverage, critical paths tested
- [ ] **Accessibility:** Passes axe scan with 0 errors
- [ ] **Dark Mode:** Tested in both light and dark themes

---

## 🚀 Phase 1 Task Priority

| Task | Effort | Impact | Do First? |
|------|--------|--------|-----------|
| Status badges on cards | 2pts | HIGH | YES |
| Confirmation dialog | 2pts | HIGH | YES |
| Category scroll improve | 1.5pts | MEDIUM | YES |
| Daily pace display | 1.5pts | MEDIUM | AFTER 1st 3 |
| ARIA labels | 2pts | HIGH | CONCURRENT |

**Recommended order:** 1.1 → 1.3 → 1.2 → 1.5 → 1.4

---

## 📊 File Locations Quick Map

```
To modify:              File location:
────────────────────────────────────────────
Status badges           allocation-card.tsx
Confirm dialog (new)    budget-confirmation-dialog.tsx
Category scroll         Budget.tsx (lines 470-500)
Daily pace              Budget.tsx + allocation-card.tsx
ARIA labels             Multiple (all components)
```

---

## 🧪 Testing Scenarios

### Mobile (320px iPhone SE)
- [ ] All cards fit without horizontal scroll
- [ ] Progress bar visible and readable
- [ ] Category scroll shows 2-3 cards
- [ ] Buttons are ≥44x44px touch targets
- [ ] No text truncation except category names

### Tablet (768px iPad)
- [ ] 2-column layout renders correctly
- [ ] Category scroll still functional
- [ ] Donut chart (Phase 2) fits in available space

### Desktop (1200px)
- [ ] 3+ column layout renders
- [ ] Detail panel opens on right (Phase 2)
- [ ] Whitespace balanced, not cramped

### Dark Mode
- [ ] Colors maintain 4.5:1 contrast
- [ ] Status badges visible in both modes
- [ ] Progress bar clearly distinguishes fill vs empty

### Accessibility (Keyboard + Screen Reader)
- [ ] Tab through all interactive elements
- [ ] Enter/Space activate buttons
- [ ] Escape closes dialogs
- [ ] Screen reader announces: status changes, card purpose, percentage values

---

## 💡 Common Implementation Patterns

### Status Badge Logic
```
if spent > allocated:     RED
else if % > 95:          AMBER
else if % > 80:          YELLOW
else:                    GREEN
```

### Daily Pace Calculation
```
Days elapsed = current_day - 1
Daily pace = amount_spent / days_elapsed (or 0 if elapsed < 1)
```

### Progress Bar Width
```
width = Math.min(100, (spent / allocated) * 100)  // Cap at 100%
```

### Confirmation Text
```
"Save changes to [month]? This will update allocations for
[category names] and set savings target to [amount]."
```

---

## 🎯 User Feedback Goals

After Phase 1 launch, gather feedback on:

1. **Clarity:** "Could you tell me your budget status in 2 seconds?" (Target: Yes 80%+)
2. **Confidence:** "Do you feel confident in your budget now?" (Target: Yes 70%+)
3. **Engagement:** "Did you explore the category cards?" (Target: Yes 40%+)
4. **Accessibility:** "Could you navigate using keyboard only?" (Target: Yes 95%+)

---

## ⚠️ Things NOT to Do

❌ Show >5 metrics at once on mobile
❌ Use color alone (always add text + icon)
❌ Make touch targets <44px on mobile
❌ Truncate currency amounts (show full value)
❌ Use jargon ("allocation," "burn rate") without explaining
❌ Animate on every interaction (use sparingly)
❌ Skip dark mode testing
❌ Assume users read all text (use visual hierarchy instead)
❌ Store unconfirmed changes
❌ Hide error states

---

## ✨ Things TO Do

✅ Test on real devices, not just browser resize
✅ Use semantic HTML (role="progressbar", role="status", etc.)
✅ Provide instant visual feedback on interactions
✅ Include secondary metrics in expanded view
✅ Show currency symbols (¥) consistently
✅ Use progress bars for any spending vs budget comparison
✅ Confirm destructive actions before executing
✅ Make keyboard navigation obvious
✅ Support reduced motion setting
✅ Test with screen readers (VoiceOver, NVDA)

---

## 📈 Metrics to Track

After each phase launches, measure:

```
Phase 1 Metrics:
- Time to identify budget status (target: <2s)
- Confirmation dialog dismissal rate (should be >80% confirm)
- Category card tap rate (target: >40%)
- Mobile engagement rate vs desktop
- Error rate / crash reports
- Accessibility audit score (target: >95)

Phase 2 Metrics:
- Donut chart interaction rate
- Detail view expansion rate
- Alert acknowledgment rate

Phase 3 Metrics:
- Predictive warning effectiveness
- Overspending reduction %
- Goal achievement rate improvement
```

---

## 🔗 Quick Links

| Need | Find In |
|------|---------|
| Visual code samples | budget-ui-patterns-visual-reference.md |
| Task breakdown | budget-ui-ux-implementation-guide.md |
| Industry context | budget-ui-ux-research.md |
| High-level overview | budget-ui-ux-summary.md |
| Full roadmap | BUDGET_UI_UX_INDEX.md |

---

## 💬 FAQ While Coding

**Q: Progress bar shows >100%, how wide should it be?**
A: Use `Math.min(100, percentage)` to cap at 100%, but show RED color to indicate overspend.

**Q: Should daily pace show in allocation cards?**
A: Yes, but only in expanded view (not default). Keep card compact.

**Q: What if user has 0 transactions in category?**
A: Show 0% and "No activity yet" message. Status badge = GREEN (on track by default).

**Q: Confirm dialog needed for every save?**
A: Yes Phase 1. Later (Phase 2) can add "Don't show again" checkbox if adoption is high.

**Q: How to handle multi-currency budgets?**
A: Display in user's preferred currency. Convert all amounts to JPY for calculations, then display in chosen currency.

**Q: Can I skip dark mode testing?**
A: No. Check contrast ratio in both modes. Use Tailwind's `dark:` prefix consistently.

---

## 🎬 Getting Started

1. **Clone latest code:** `git pull origin main`
2. **Check out branch:** `git checkout -b feat/budget-ui-phase1`
3. **Open Budget.tsx:** `/frontend/src/pages/Budget.tsx`
4. **Reference patterns:** Keep `budget-ui-patterns-visual-reference.md` open
5. **Follow tasks:** Work through Phase 1 tasks in recommended order
6. **Test early:** Run tests after each component, not at end
7. **Push PR:** Link to `budget-ui-ux-implementation-guide.md` in PR description

---

## 📞 When to Ask Questions

Ask for clarification on:
- ✅ Component behavior on specific screen size
- ✅ Accessibility requirement interpretation
- ✅ Design approval for visual change
- ✅ Whether feature should be in Phase 1 or later

Don't wait on:
- ❌ CSS styling details (reference design-guidelines.md)
- ❌ TypeScript setup (use existing patterns)
- ❌ Git workflow (standard PR process)
- ❌ Testing approach (use Jest + React Testing Library pattern)

---

**Ready to Code** → Start with Task 1.1: Status Badges
See `budget-ui-patterns-visual-reference.md` for StatusBadge component code.
