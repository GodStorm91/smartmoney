# Color Palette

## Primary Colors

```css
Primary (Brand):
  --primary-50:  #E8F5E9  /* Lightest tint */
  --primary-100: #C8E6C9
  --primary-200: #A5D6A7
  --primary-300: #81C784
  --primary-400: #66BB6A
  --primary-500: #4CAF50  /* Main brand color - Trust, Growth, Money */
  --primary-600: #43A047
  --primary-700: #388E3C
  --primary-800: #2E7D32
  --primary-900: #1B5E20  /* Darkest shade */
```

## Semantic Colors

```css
Income (Green):
  --income-light: #81C784
  --income-main:  #4CAF50
  --income-dark:  #388E3C

Expense (Red):
  --expense-light: #E57373
  --expense-main:  #F44336
  --expense-dark:  #D32F2F

Net/Savings (Blue):
  --net-light: #64B5F6
  --net-main:  #2196F3
  --net-dark:  #1976D2

Warning (Amber):
  --warning-light: #FFD54F
  --warning-main:  #FFC107
  --warning-dark:  #FFA000

Error (Deep Red):
  --error-light: #EF5350
  --error-main:  #D32F2F
  --error-dark:  #C62828

Success (Green):
  --success-light: #66BB6A
  --success-main:  #4CAF50
  --success-dark:  #388E3C

Info (Light Blue):
  --info-light: #4FC3F7
  --info-main:  #03A9F4
  --info-dark:  #0288D1
```

## Neutral/Grayscale

```css
Grays (UI Background & Text):
  --gray-50:  #FAFAFA   /* Page background */
  --gray-100: #F5F5F5   /* Card background */
  --gray-200: #EEEEEE   /* Border light */
  --gray-300: #E0E0E0   /* Border */
  --gray-400: #BDBDBD   /* Border dark */
  --gray-500: #9E9E9E   /* Disabled text */
  --gray-600: #757575   /* Secondary text */
  --gray-700: #616161   /* Body text */
  --gray-800: #424242   /* Heading text */
  --gray-900: #212121   /* Primary text */
  --white:    #FFFFFF
  --black:    #000000
```

## Color Usage Rules

1. **Income/Expense/Net**: Always consistent
   - Income = Green (#4CAF50)
   - Expense = Red (#F44336)
   - Net = Blue (#2196F3)

2. **Backgrounds**:
   - Page: `--gray-50` (#FAFAFA)
   - Cards: `--white` or `--gray-100`
   - Hover: `--gray-100`

3. **Text Hierarchy**:
   - Primary: `--gray-900`
   - Secondary: `--gray-600`
   - Disabled: `--gray-500`

4. **Contrast Ratios** (WCAG AA):
   - Normal text: ≥ 4.5:1
   - Large text (≥18px): ≥ 3:1
   - UI components: ≥ 3:1

## Dark Mode (Future)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --gray-50:  #1A1A1A;
    --gray-100: #242424;
    --gray-200: #2E2E2E;
    --gray-800: #E0E0E0;
    --gray-900: #FFFFFF;
    --primary-500: #66BB6A; /* Lighter for dark bg */
  }
}
```
