# Animations & Micro-Interactions

## Timing Guidelines

```css
Instant:    0ms         | Toggle switches, instant feedback
Fast:       150ms       | Button hover, input focus
Default:    250ms       | Card hover, dropdown open
Moderate:   350ms       | Modal open, slide-in panels
Slow:       500ms       | Page transitions, complex animations
```

## Easing Curves

```css
ease-out:       cubic-bezier(0, 0, 0.2, 1)     | Entry (elements appearing)
ease-in:        cubic-bezier(0.4, 0, 1, 1)     | Exit (elements disappearing)
ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1)   | State changes (expand/collapse)
spring:         Custom (for playful interactions)
```

### When to Use

- **ease-out**: Elements entering viewport, modals opening, dropdowns expanding
- **ease-in**: Elements leaving viewport, modals closing, items being removed
- **ease-in-out**: Toggle states, accordion expand/collapse, smooth transitions

## Component Animations

### Button Hover
```css
.button {
  transition: all 150ms ease-out;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.12);
}

.button:active {
  transform: translateY(0);
  transition-duration: 50ms;
}
```

### Card Hover
```css
.card {
  transition: all 250ms ease-out;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}
```

### Input Focus
```css
.input {
  transition: border-color 150ms ease-out,
              box-shadow 150ms ease-out;
}

.input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}
```

### Modal Open/Close
```css
/* Backdrop */
.modal-backdrop {
  animation: fadeIn 150ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal panel */
.modal-panel {
  animation: scaleIn 250ms ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Toast Notification
```css
/* Entry from right */
.toast-enter {
  animation: slideInRight 250ms ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Exit to right */
.toast-exit {
  animation: slideOutRight 200ms ease-in;
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
```

### Dropdown Menu
```css
.dropdown-menu {
  animation: dropdownOpen 200ms ease-out;
  transform-origin: top;
}

@keyframes dropdownOpen {
  from {
    opacity: 0;
    transform: scaleY(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scaleY(1) translateY(0);
  }
}
```

### Skeleton Loading
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-100) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Number Counter (KPI)
```javascript
// Animate count-up for KPI numbers
function animateValue(element, start, end, duration = 800) {
  const startTime = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(progress);

    const current = Math.floor(start + (end - start) * easedProgress);
    element.textContent = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
```

### Progress Bar
```css
.progress-bar {
  transition: width 600ms ease-out,
              background-color 300ms ease-out;
}

/* Animate width from 0 to target percentage */
.progress-bar.animate {
  animation: progressGrow 600ms ease-out;
}

@keyframes progressGrow {
  from { width: 0; }
  /* to: determined by inline style */
}
```

### List Item Stagger
```css
/* Stagger animation for list items */
.list-item {
  animation: fadeInUp 300ms ease-out backwards;
}

.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
.list-item:nth-child(4) { animation-delay: 150ms; }
.list-item:nth-child(5) { animation-delay: 200ms; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Page Transition
```css
.page-enter {
  animation: pageEnter 300ms ease-out;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Micro-Interactions

### File Upload Drag-Over
```css
.upload-zone {
  transition: all 200ms ease-out;
}

.upload-zone.drag-over {
  border-color: var(--primary-500);
  background-color: var(--primary-50);
  transform: scale(1.02);
}
```

### Success Checkmark
```css
.success-icon {
  animation: successPop 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes successPop {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Button Click Ripple
```css
.button-ripple {
  position: relative;
  overflow: hidden;
}

.button-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  transform: translate(-50%, -50%);
  transition: width 400ms ease-out, height 400ms ease-out;
}

.button-ripple:active::after {
  width: 200px;
  height: 200px;
}
```

### Attention Pulse (Errors)
```css
.error-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
  }
}
```

### Tooltip Appear
```css
.tooltip {
  animation: tooltipAppear 150ms ease-out;
}

@keyframes tooltipAppear {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Performance Optimization

### GPU Acceleration
Only animate these properties for best performance:
- `transform`
- `opacity`
- `filter` (use sparingly)

Avoid animating:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `border-width`

### Will-Change
```css
/* Use sparingly, only for complex animations */
.complex-animation {
  will-change: transform, opacity;
}

/* Remove after animation completes */
.animation-done {
  will-change: auto;
}
```

## Reduced Motion

Always respect user preferences:

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

Provide alternatives:
- Instant state changes instead of transitions
- Static indicators instead of pulsing/blinking
- Immediate content updates instead of sliding

## Animation Checklist

- [ ] Duration appropriate for action (150-300ms typical)
- [ ] Easing curve matches animation type
- [ ] GPU-accelerated properties only
- [ ] Respects `prefers-reduced-motion`
- [ ] Serves functional purpose (not decoration)
- [ ] Doesn't block user interaction
- [ ] Consistent timing across similar components
- [ ] Tested on low-end devices
