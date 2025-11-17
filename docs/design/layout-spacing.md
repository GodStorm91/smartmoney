# Layout & Spacing

## Spacing Scale

8px base unit system (Tailwind-compatible):

```
Space-0:   0px
Space-1:   4px    (0.25rem)  | Tight spacing
Space-2:   8px    (0.5rem)   | Default gap
Space-3:   12px   (0.75rem)  | Small padding
Space-4:   16px   (1rem)     | Standard padding
Space-5:   20px   (1.25rem)  | Medium padding
Space-6:   24px   (1.5rem)   | Large padding
Space-8:   32px   (2rem)     | Section spacing
Space-10:  40px   (2.5rem)   | Extra large
Space-12:  48px   (3rem)     | Page section gap
Space-16:  64px   (4rem)     | Hero spacing
Space-20:  80px   (5rem)     | Extra spacing
Space-24:  96px   (6rem)     | Maximum spacing
```

## Component Spacing

```
Button padding:      12px 24px (py-3 px-6)
Card padding:        24px (p-6)
Input padding:       12px 16px (py-3 px-4)
Section gap:         48px (gap-12)
Container padding:
  - Mobile:    16px
  - Tablet:    24px
  - Desktop:   32px
```

## Responsive Breakpoints

```css
Mobile (xs):    320px - 639px   (default)
Mobile-L (sm):  640px - 767px   (sm:)
Tablet (md):    768px - 1023px  (md:)
Laptop (lg):    1024px - 1279px (lg:)
Desktop (xl):   1280px - 1535px (xl:)
Desktop-L (2xl): 1536px+        (2xl:)
```

## Container Widths

```css
Mobile:    100% - 32px padding
Tablet:    768px - 48px padding
Desktop:   1280px - 64px padding
Max-width: 1440px
```

## Grid Patterns

### Bento Grid (Dashboard)

```css
.grid-bento {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* Featured card spans 2 columns */
.card-featured {
  grid-column: span 2;
}
```

Mobile: 1 column, stacked
Tablet: 2 columns, mixed sizes
Desktop: 3-4 columns, asymmetric

### Dashboard Grid Example

Desktop (3 cols):
```
┌─────────────┬─────────────┬─────────────┐
│  Summary    │  Summary    │  Quick      │
│  (2 cols)   │  (2 cols)   │  Actions    │
├─────────────┴─────────────┼─────────────┤
│  12-Month Trend Chart     │  Goals Card │
│  (2 cols)                 │  (1 col)    │
├───────────────────────────┴─────────────┤
│  Category Breakdown (3 cols)            │
└─────────────────────────────────────────┘
```

Tablet (2 cols): Stack into 2-column layout
Mobile (1 col): Single column stack

## Responsive Patterns

### Navigation
- Mobile: Hamburger → slide-in drawer
- Desktop: Horizontal top nav or sidebar

### Dashboard
- Mobile: Single column stack
- Tablet: 2-column grid
- Desktop: 3-4 column Bento grid

### Tables
- Mobile: Card-based list (stack rows)
- Desktop: Traditional table

### Charts
- Mobile: Simplified, larger touch areas
- Desktop: Full detail, hover tooltips

## Touch vs Hover

Mobile:
- Tap interactions
- Swipe gestures
- Touch targets ≥ 44x44px
- 8px spacing between targets

Desktop:
- Hover states
- Keyboard shortcuts
- Smaller interactive elements acceptable
