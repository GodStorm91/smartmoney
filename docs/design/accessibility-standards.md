# Accessibility Standards (WCAG 2.1 AA)

## Color Contrast

Requirements:
- Normal text (16px): ≥ 4.5:1
- Large text (≥18px): ≥ 3:1
- UI components: ≥ 3:1
- Active UI components: ≥ 3:1

Test all color combinations before use.

## Keyboard Navigation

### Requirements
1. All interactive elements focusable via Tab
2. Focus indicator visible and clear
3. Tab order logical (top→bottom, left→right)
4. Escape key closes modals/dropdowns
5. Arrow keys navigate within components
6. Enter/Space activates buttons

### Focus Styles
```css
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove default outline */
:focus:not(:focus-visible) {
  outline: none;
}
```

## Screen Reader Support

### Semantic HTML
Use proper elements:
- `<nav>` for navigation
- `<main>` for main content
- `<section>` for sections
- `<article>` for standalone content
- `<aside>` for sidebars
- `<header>` / `<footer>`

### ARIA Labels

KPI Card:
```html
<div role="region" aria-label="Current month summary">
  <h3 id="income-label">Total Income</h3>
  <p aria-labelledby="income-label">¥250,000</p>
</div>
```

Chart:
```html
<div role="img" aria-label="12-month net cashflow trend chart showing upward trend">
  <svg>...</svg>
  <!-- Provide data table fallback -->
</div>
```

Status Badge:
```html
<span role="status" aria-label="Goal status: on track">
  <span aria-hidden="true">→</span> On Track
</span>
```

File Upload:
```html
<div role="button"
     aria-label="Upload CSV file, drag and drop or click"
     tabindex="0"
     onKeyDown={handleKeyPress}>
  Drag and drop or click to upload
</div>
```

Dynamic Content:
```html
<!-- Live region for updates -->
<div aria-live="polite" aria-atomic="true">
  Transaction imported successfully
</div>

<!-- Status updates -->
<div role="status" aria-live="polite">
  Loading transactions...
</div>
```

## Touch Targets

Mobile:
- Minimum size: 44x44px
- Minimum spacing: 8px between targets
- Larger is better: 48x48px recommended

Desktop:
- Minimum size: 24x24px acceptable
- Clear hover states

## Motion & Animation

### Respect User Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Animation Guidelines
- Keep duration short (150-300ms)
- Provide static alternatives
- Avoid flashing/strobing (seizure risk)
- Don't rely solely on animation to convey information

## Forms

### Labels
```html
<!-- Always visible labels -->
<label for="amount">Amount (¥)</label>
<input id="amount" type="number" />

<!-- NOT this (placeholder-only) -->
<input type="text" placeholder="Amount" />
```

### Required Fields
```html
<label for="date">
  Date <span aria-label="required">*</span>
</label>
<input id="date" type="date" required aria-required="true" />
```

### Error Messages
```html
<label for="amount">Amount</label>
<input
  id="amount"
  type="number"
  aria-invalid="true"
  aria-describedby="amount-error"
/>
<span id="amount-error" role="alert">
  Amount must be greater than 0
</span>
```

### Field Groups
```html
<fieldset>
  <legend>Date Range</legend>
  <label for="start-date">Start Date</label>
  <input id="start-date" type="date" />

  <label for="end-date">End Date</label>
  <input id="end-date" type="date" />
</fieldset>
```

## Images & Icons

### Decorative Icons
```html
<span aria-hidden="true">
  <ChartBarIcon />
</span>
```

### Informative Icons
```html
<span role="img" aria-label="Income trending up">
  <ArrowTrendingUpIcon />
</span>
```

### Images
```html
<!-- Informative -->
<img src="chart.png" alt="12-month cashflow trend showing steady growth" />

<!-- Decorative -->
<img src="decoration.png" alt="" role="presentation" />
```

## Color Usage

Never rely on color alone to convey information:

❌ Bad:
- Red text = expense, Green text = income (color-only)

✅ Good:
- Icons + Color: "↗ Income" (green), "↘ Expense" (red)
- Text labels: "Income: ¥250,000" (green)
- Patterns/textures in charts (not just color)

## Tables

### Accessible Data Tables
```html
<table>
  <caption>November 2025 Transactions</caption>
  <thead>
    <tr>
      <th scope="col">Date</th>
      <th scope="col">Description</th>
      <th scope="col">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2025-11-17</td>
      <td>Grocery shopping</td>
      <td>¥5,000</td>
    </tr>
  </tbody>
</table>
```

### Responsive Tables (Mobile)
When stacking table rows as cards, maintain semantic structure with ARIA:
```html
<div role="table" aria-label="Transactions">
  <div role="row">
    <span role="columnheader">Date</span>
    <span role="cell">2025-11-17</span>
  </div>
</div>
```

## Skip Links

```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<main id="main-content">
  <!-- Page content -->
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: var(--primary-500);
  color: white;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

## Testing Checklist

- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrows)
- [ ] Focus indicators visible on all interactive elements
- [ ] Screen reader announces all content correctly (test with NVDA/JAWS/VoiceOver)
- [ ] Color contrast passes WCAG AA (use WebAIM contrast checker)
- [ ] Touch targets ≥ 44x44px on mobile
- [ ] Forms have visible labels and error messages
- [ ] Images have appropriate alt text
- [ ] ARIA labels present for dynamic content
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Content readable at 200% zoom
- [ ] Works without mouse (keyboard-only)
- [ ] Works without color (test in grayscale)
