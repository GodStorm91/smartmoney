# Component Patterns

## Buttons

### Primary Button
```css
Background: var(--primary-500)
Text: white
Padding: 12px 24px
Border-radius: 8px
Font: 16px / 600
Shadow: 0 2px 4px rgba(0,0,0,0.1)
Hover: var(--primary-600) + shadow-md
Active: var(--primary-700)
Disabled: var(--gray-400) + opacity 0.6
Touch Target: Minimum 44x44px
```

### Secondary Button
```css
Background: transparent
Border: 2px solid var(--primary-500)
Text: var(--primary-500)
Hover: background var(--primary-50)
```

### Ghost Button
```css
Background: transparent
Text: var(--gray-700)
Hover: background var(--gray-100)
```

## Cards

### Standard Card
```css
Background: white
Border-radius: 12px
Padding: 24px
Shadow: 0 1px 3px rgba(0,0,0,0.08)
Border: 1px solid var(--gray-200)
Hover: shadow-md (0 4px 8px rgba(0,0,0,0.1))
```

### KPI Card
```
Layout:
  Icon: Top-left corner (24px)
  Number: 42px / Inter / Bold
  Label: 14px / Gray-600
  Trend: Arrow + percentage (green/red)

Example:
┌─────────────────────┐
│ 💰                  │
│ ¥250,000           │
│ Total Income        │
│ ↗ +12.5%           │
└─────────────────────┘
```

### Goal Card
```
Elements:
  - Progress bar with percentage
  - Target amount + current amount
  - Status badge (ahead/on-track/behind)
  - Required monthly savings indicator
```

## Forms & Inputs

### Text Input
```css
Height: 48px
Padding: 12px 16px
Border: 1px solid var(--gray-300)
Border-radius: 8px
Font: 16px (prevent zoom on iOS)
Focus: border var(--primary-500) + shadow
Error: border var(--error-main) + error message
Disabled: background var(--gray-100)
```

### File Upload (Drag-Drop)
```css
Border: 2px dashed var(--gray-400)
Background: var(--gray-50)
Padding: 48px
Border-radius: 12px
Hover: border var(--primary-500)
Active (drag-over): background var(--primary-50)
Min-height: 200px
```

### Select Dropdown
```css
Same styling as text input
Chevron icon: right-aligned
Dropdown panel:
  - shadow-lg
  - max-height: 300px
  - overflow-y: auto
  - border-radius: 8px
```

## Tables

### Transaction Table
```css
Header:
  - background: var(--gray-100)
  - font-weight: 600
  - text-transform: uppercase
  - font-size: 12px
  - letter-spacing: 0.05em

Row:
  - border-bottom: 1px solid var(--gray-200)
  - padding: 16px 12px
  - hover: background var(--gray-50)

Amount Column:
  - text-align: right
  - font-family: Inter
  - font-weight: 500
  - color based on type (green/red/blue)

Responsive (Mobile <640px):
  - Stack rows as cards
  - Labels inline with values
```

## Charts (Recharts)

### Line Chart (Trend)
```css
Line: stroke var(--net-main), stroke-width: 2px
Area fill: gradient (primary-200 → transparent)
Grid: stroke var(--gray-200), stroke-dasharray: 3 3
Tooltip:
  - background: white
  - shadow-lg
  - border-radius: 8px
  - padding: 12px
```

### Bar Chart (Category)
```css
Bar color: var(--primary-500)
Gap: 8px between bars
Border-radius: 4px (top corners only)
Hover: opacity 0.8
```

### Pie/Donut Chart
```css
Colors: Sequential palette (primary-100 to primary-900)
Labels: Outside with leader lines
Center (Donut): Total amount
Active segment: scale 1.05
```

### Waterfall Chart (Cashflow)
```css
Income bars: var(--income-main)
Expense bars: var(--expense-main)
Net bars: var(--net-main)
Connector lines: dashed, stroke-width: 1px
```

## Badges & Status

### Status Badge
```css
Ahead:
  background: #E8F5E9
  color: #2E7D32
  icon: ↗

On-track:
  background: #E3F2FD
  color: #1565C0
  icon: →

Behind:
  background: #FFEBEE
  color: #C62828
  icon: ↘

Styling:
  padding: 4px 12px
  border-radius: 16px (pill)
  font: 12px / 500
  display: inline-flex
  align-items: center
  gap: 4px
```

### Category Badge
```css
Padding: 4px 12px
Border-radius: 16px (pill)
Font: 12px / 500
Background: category color light variant
Text: category color dark variant
```

## Loading States

### Skeleton
```css
Background: linear-gradient(
  90deg,
  var(--gray-200) 0%,
  var(--gray-100) 50%,
  var(--gray-200) 100%
)
Background-size: 200% 100%
Animation: shimmer 1.5s ease-in-out infinite
Border-radius: matches component
```

```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Spinner
```css
Size: 24px (default), 48px (large)
Color: var(--primary-500)
Border: 3px solid var(--primary-200)
Border-top-color: var(--primary-500)
Animation: spin 1s linear infinite
```

## Empty States

### No Data
```
Layout (centered):
  Icon: 64px, color gray-400
  Heading: "No transactions yet"
  Description: "Upload a CSV file to get started"
  Action: Primary button "Upload CSV"
  Padding: 64px vertical
```

### Error State
```
Layout:
  Icon: ExclamationTriangleIcon (48px, warning color)
  Heading: Error message
  Description: Helpful guidance
  Actions: Retry button + Help link
```

## Icons

Library: Heroicons v2
Sizes: 16px, 20px, 24px, 32px, 48px
Style: Outline (UI), Solid (emphasis)

Common icons:
- Upload: ArrowUpTrayIcon
- Income: ArrowTrendingUpIcon
- Expense: ArrowTrendingDownIcon
- Filter: FunnelIcon
- Calendar: CalendarIcon
- Settings: Cog6ToothIcon
- Chart: ChartBarIcon
- Goal: FlagIcon
