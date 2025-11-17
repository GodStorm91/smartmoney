# Typography System

## Font Selection

**Primary Font**: Noto Sans JP
- Japanese language support with complete character set (ひらがな, カタカナ, 漢字, Vietnamese diacritics)
- Clean, modern, highly legible for financial data
- Google Fonts: `Noto Sans JP:wght@300;400;500;600;700`

**Secondary Font (Numbers/Data)**: Inter
- Optimized for financial figures and KPIs
- Tabular numbers for aligned columns
- Google Fonts: `Inter:wght@400;500;600;700`

**Monospace (Optional)**: Roboto Mono
- CSV data preview, technical settings
- Google Fonts: `Roboto Mono:wght@400;500`

## Type Scale

Base: 16px (1rem)

```
Display:    48px / 3rem    | font-weight: 700 | line-height: 1.1  | Hero sections
H1:         36px / 2.25rem | font-weight: 700 | line-height: 1.2  | Page titles
H2:         30px / 1.875rem| font-weight: 600 | line-height: 1.25 | Section headers
H3:         24px / 1.5rem  | font-weight: 600 | line-height: 1.3  | Card titles
H4:         20px / 1.25rem | font-weight: 500 | line-height: 1.35 | Subsection headers
Body:       16px / 1rem    | font-weight: 400 | line-height: 1.6  | Default text
Body-sm:    14px / 0.875rem| font-weight: 400 | line-height: 1.5  | Secondary text
Caption:    12px / 0.75rem | font-weight: 400 | line-height: 1.4  | Labels, metadata
```

## KPI/Number Display

```
Large KPI:  42px / 2.625rem | font-weight: 700 | Inter | Dashboard totals
Medium KPI: 32px / 2rem     | font-weight: 600 | Inter | Card metrics
Small KPI:  24px / 1.5rem   | font-weight: 600 | Inter | List amounts
Table:      16px / 1rem     | font-weight: 500 | Inter | Transaction amounts
```

## Japanese Text Considerations

```css
body {
  font-family: 'Noto Sans JP', sans-serif;
  line-height: 1.8; /* Higher for Japanese */
  word-break: keep-all; /* Better line breaks */
  letter-spacing: 0.02em;
}

h1, h2, h3 {
  letter-spacing: -0.02em; /* Tighter for headers */
  line-height: 1.4;
}
```

- Line height: 1.6-1.8 for Japanese text (higher than Latin)
- Word breaking: `word-break: keep-all` for better line wrapping
- Letter spacing: -0.02em for headers, normal for body
- Vertical alignment: Use `vertical-align: middle` for mixed Latin/Japanese

## Number & Date Formatting

### Currency
```javascript
const amount = 250000;
const formatted = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  minimumFractionDigits: 0
}).format(amount);
// Output: ¥250,000
```

### Percentage
```javascript
const percent = 0.156;
const formattedPercent = new Intl.NumberFormat('ja-JP', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
}).format(percent);
// Output: 15.6%
```

### Date
```javascript
// Full date
const date = new Date('2025-11-17');
const formatted = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(date);
// Output: 2025年11月17日月曜日

// Short date
const shortDate = new Intl.DateTimeFormat('ja-JP').format(date);
// Output: 2025/11/17
```
