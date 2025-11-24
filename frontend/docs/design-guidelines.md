# Design Guidelines

## Design System Overview
SmartMoney follows modern, clean design principles with focus on readability, accessibility, and multilingual support.

## Color Palette

### Primary Colors
- **Primary Blue**: `#3B82F6` (Tailwind `blue-500`)
- **Primary Hover**: `#2563EB` (Tailwind `blue-600`)
- **Primary Light**: `#EFF6FF` (Tailwind `blue-50`)

### Semantic Colors
- **Success**: `#10B981` (Green - income, positive)
- **Danger**: `#EF4444` (Red - expenses, negative)
- **Warning**: `#F59E0B` (Orange - alerts)
- **Info**: `#3B82F6` (Blue - neutral info)

### Neutral Colors
- **Text Primary**: `#111827` (Gray-900)
- **Text Secondary**: `#6B7280` (Gray-500)
- **Border**: `#E5E7EB` (Gray-200)
- **Background**: `#FFFFFF` / `#F9FAFB` (White/Gray-50)

## Typography

### Font Family
- **System Font Stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Supports Japanese, Vietnamese, and Latin scripts

### Font Sizes
- **Heading 1**: `text-3xl` (30px) - Page titles
- **Heading 2**: `text-2xl` (24px) - Section headers
- **Heading 3**: `text-xl` (20px) - Subsections
- **Body**: `text-base` (16px) - Standard text
- **Small**: `text-sm` (14px) - Labels, captions
- **Extra Small**: `text-xs` (12px) - Metadata

### Font Weights
- **Bold**: `font-bold` (700) - Headings, emphasis
- **Semibold**: `font-semibold` (600) - Subheadings
- **Medium**: `font-medium` (500) - Buttons, labels
- **Normal**: `font-normal` (400) - Body text

## Spacing System
Based on Tailwind's 4px spacing scale:
- **xs**: `p-2` (8px)
- **sm**: `p-3` (12px)
- **md**: `p-4` (16px)
- **lg**: `p-6` (24px)
- **xl**: `p-8` (32px)

## Component Patterns

### Cards
```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  {/* Content */}
</div>
```

### Buttons
```tsx
// Primary
<button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">

// Secondary
<button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

// Danger
<button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
```

### Form Inputs
```tsx
<input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
```

### Badges
```tsx
<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
  Badge Text
</span>
```

## Multilingual UI Guidelines

### Language Switcher Placement
**Location**: Top-right corner of header, before settings/profile icons

**Desktop Layout:**
```
[Flag Icon] [Language Name] [Dropdown Arrow]
🇯🇵 日本語 ▼
```

**Mobile Layout (< 640px):**
```
[Flag Icon] [Dropdown Arrow]
🇯🇵 ▼
```

### Flag Icons Used
- **Japanese**: 🇯🇵 (U+1F1EF U+1F1F5)
- **English**: 🇺🇸 (U+1F1FA U+1F1F8)
- **Vietnamese**: 🇻🇳 (U+1F1FB U+1F1F3)

### Language Dropdown Design

**Trigger Button:**
- Padding: `px-3 py-2`
- Border radius: `rounded-lg`
- Hover: `hover:bg-gray-100`
- Focus ring: `focus:ring-2 focus:ring-primary-500`

**Dropdown Menu:**
- Width: `w-48` (192px)
- Shadow: `shadow-lg`
- Border: `border border-gray-200`
- Position: Absolute right-aligned
- Z-index: `z-50`

**Menu Items:**
- Layout: Flag (left) + Name (center) + Checkmark (right, if selected)
- Padding: `px-4 py-3`
- Hover: `hover:bg-gray-50`
- Active state: `bg-primary-50 text-primary-700`
- Rounded: First item `rounded-t-lg`, last item `rounded-b-lg`

**Visual Hierarchy:**
```
┌─────────────────────┐
│ 🇯🇵  日本語        ✓│  ← Active (primary-50 bg)
├─────────────────────┤
│ 🇺🇸  English        │
├─────────────────────┤
│ 🇻🇳  Tiếng Việt     │
└─────────────────────┘
```

### Responsive Behavior

**Desktop (≥640px):**
- Show flag icon + language name
- Full dropdown width (192px)

**Tablet (640px - 768px):**
- Show flag icon + language name
- Slightly condensed padding

**Mobile (<640px):**
- Show flag icon only (via `hidden sm:inline`)
- Dropdown remains full-featured
- Touch-friendly hit areas (min 44px height)

### Text Overflow Handling
- Long translations use `truncate` or `line-clamp-2`
- Tooltips on hover for truncated text
- Test with longest language strings (usually German/Vietnamese)

### Date/Number Formatting
- Use locale-aware formatting (future implementation)
- Japanese: YYYY年MM月DD日
- English: MM/DD/YYYY
- Vietnamese: DD/MM/YYYY

## Accessibility Guidelines

### Language Switcher Accessibility

**ARIA Attributes:**
```tsx
<button
  aria-label={t('language.selectLanguage')}
  aria-expanded={isOpen}
  aria-haspopup="true"
>
  {/* Trigger */}
</button>

<div role="menu">
  <button role="menuitem">
    {/* Language option */}
  </button>
</div>
```

**ARIA Labels (Localized):**
- All interactive elements have translated ARIA labels
- Status indicators include text alternatives
- Icon-only elements use `aria-label`

**Keyboard Navigation:**
- Tab: Navigate to language switcher
- Enter/Space: Open dropdown
- Arrow keys: Navigate options
- Escape: Close dropdown
- Enter: Select language

**Screen Reader Support:**
- Announce current language
- Announce when dropdown opens/closes
- Announce selected language on change

### Focus Management
- Visible focus rings: `focus:ring-2 focus:ring-primary-500`
- Maintain focus when switching languages
- Trap focus in open dropdown

### Color Contrast
- Text on backgrounds: Minimum 4.5:1 ratio (WCAG AA)
- Interactive elements: Minimum 3:1 ratio
- Test with all language character sets

## Icon Guidelines

### Icon Library
**Lucide React** - Consistent, accessible SVG icons

### Icon Sizes
- **Small**: `w-4 h-4` (16px) - Inline with text
- **Medium**: `w-5 h-5` (20px) - Buttons, badges
- **Large**: `w-6 h-6` (24px) - Headers, emphasis

### Icon Usage
- Always include `aria-hidden="true"` for decorative icons
- Provide text labels or `aria-label` for icon-only buttons
- Maintain 1:1 aspect ratio

## Animation & Transitions

### Dropdown Animations
```tsx
className="transition-transform duration-200"
// Chevron rotates 180deg when open
```

### Hover States
- Duration: `duration-200`
- Easing: Default (ease-in-out)
- Properties: `background-color`, `transform`

### Loading States
- Skeleton screens for data loading
- Spinner for actions
- Smooth fade-in for loaded content

## Layout Patterns

### Header
- Fixed height: `h-16` (64px)
- Shadow: `shadow-sm`
- Sticky on scroll: `sticky top-0`
- Z-index: `z-40`

### Content Container
- Max width: `max-w-7xl`
- Centered: `mx-auto`
- Padding: `px-4 sm:px-6 lg:px-8`

### Grid Layouts
- Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Gap: `gap-6` (24px)

## Multilingual Content Guidelines

### Text Expansion
Account for text length variations:
- **Japanese**: Usually shortest (Kanji compression)
- **English**: Medium length
- **Vietnamese**: Can be 30% longer with diacritics

**Design Considerations:**
- Use flexible layouts (flex, grid)
- Avoid fixed widths for text containers
- Test buttons with longest language
- Allow multi-line for long translations

### Character Support
- Ensure font stack supports:
  - Japanese: Hiragana, Katakana, Kanji
  - Vietnamese: Diacritical marks (ă, ê, ô, ơ, ư)
  - English: Latin alphabet

### Line Height
- Body text: `leading-relaxed` (1.625) - Better for dense scripts
- Headings: `leading-tight` (1.25)

## Dark Mode (Future)
- Plan for dark mode toggle
- Use CSS variables for theme switching
- Maintain WCAG contrast ratios in dark mode

## Design Tokens (Future)
- Move hardcoded colors to CSS variables
- Create design token system
- Sync with design tools (Figma)

## Testing Multilingual UI
1. Test all 3 languages in every component
2. Verify layout doesn't break with longest text
3. Check alignment with RTL (future Arabic/Hebrew)
4. Screenshot test across viewport sizes
5. Verify flag icons render correctly

## Error Handling Patterns

### Differentiate Empty State from Error State
- **Empty State (404)**: User has no data yet (expected) → Show creation form
- **Error State (500, network)**: Something went wrong → Show error message

### API Response Handling with React Query
```tsx
// ✅ GOOD: Handle 404 as empty state
const { data, error } = useQuery({
  queryKey: ['resource'],
  queryFn: async () => {
    try {
      return await getResource()
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null  // Empty state, not error
      }
      throw err  // Real error
    }
  }
})

// ❌ BAD: Treat all HTTP errors the same
const { data, error } = useQuery({
  queryKey: ['resource'],
  queryFn: getResource  // 404 becomes error
})
```

### Error UI Styling
- **Empty State**: Neutral colors, inviting action
  ```tsx
  <Card className="p-6">
    <p className="text-gray-600">No data yet. Create your first item!</p>
    <Button>Create</Button>
  </Card>
  ```
- **Error State**: Red semantics, explain issue
  ```tsx
  <Card className="p-6 border-red-200 bg-red-50">
    <p className="text-red-600">{error.message}</p>
  </Card>
  ```

### Loading States
- Use `LoadingSpinner` for full-page loading
- Use skeleton screens for partial content
- Show inline spinners for button actions
- Maintain layout stability (prevent shifts)

## Financial Input Patterns

### Currency Input Fields

Financial input fields display currency symbols and format numbers with thousand separators for better readability.

#### Implementation Pattern
```tsx
import { useSettings } from '@/contexts/SettingsContext'
import {
  formatNumberWithSeparators,
  parseFormattedNumber,
  getCurrencySymbol,
  getCurrencyPosition,
  getCurrencyDecimals,
} from '@/utils/formatNumber'

// Get currency from settings
const { currency } = useSettings()
const currencySymbol = getCurrencySymbol(currency)
const currencyPosition = getCurrencyPosition(currency)
const decimalPlaces = getCurrencyDecimals(currency)

// Format input on change
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const cleaned = e.target.value.replace(/[^\d.]/g, '')
  if (cleaned) {
    const numValue = parseFloat(cleaned)
    if (!isNaN(numValue)) {
      setValue(formatNumberWithSeparators(numValue, decimalPlaces))
    }
  }
}
```

#### UI Structure
```tsx
<div className="relative">
  {/* Prefix currency (JPY, USD) */}
  {currencyPosition === 'prefix' && (
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span className="text-gray-500 sm:text-sm font-medium">{currencySymbol}</span>
    </div>
  )}

  <Input
    type="text"
    inputMode="decimal"
    value={formattedValue}
    onChange={handleInputChange}
    placeholder={formatNumberWithSeparators(500000, decimalPlaces)}
    className={currencyPosition === 'prefix' ? 'pl-8' : 'pr-10'}
  />

  {/* Suffix currency (VND) */}
  {currencyPosition === 'suffix' && (
    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
      <span className="text-gray-500 sm:text-sm font-medium">{currencySymbol}</span>
    </div>
  )}
</div>
```

#### Visual Examples
- **JPY**: `¥ 500,000` (prefix, no decimals)
- **USD**: `$ 5,000.00` (prefix, 2 decimals)
- **VND**: `5,000,000 ₫` (suffix, no decimals)

#### Design Specifications
- **Currency Symbol**: Gray-500 color, sm size, medium weight
- **Input Padding**: `pl-8` for prefix, `pr-10` for suffix
- **Symbol Position**: Absolute positioning with pointer-events-none
- **Input Type**: Use `type="text"` with `inputMode="decimal"` for better mobile UX
- **Thousand Separators**: Comma (,) as separator, auto-format on input
- **Decimal Places**: 0 for JPY/VND, 2 for USD/EUR

#### Accessibility
- Use `inputMode="decimal"` to trigger numeric keyboard on mobile
- Maintain required validation on numeric value, not formatted string
- Provide clear placeholder showing expected format
- Currency symbol has `pointer-events-none` to avoid click interference
- Keep label and hint text clear about expected input

#### Mobile Considerations
- `inputMode="decimal"` triggers numeric keyboard with decimal point
- Touch-friendly input field (min 44px height)
- Currency symbol visible but doesn't interfere with typing
- Formatted placeholder guides user input format

#### Data Handling
```tsx
// On submit: Parse formatted string back to number
const numericValue = parseFormattedNumber(formattedValue)
const amountInCents = Math.round(numericValue * Math.pow(10, decimalPlaces))

// JPY: 500,000 → 500000 (stored as-is)
// USD: 5,000.00 → 500000 (stored in cents)
// VND: 5,000,000 → 5000000 (stored as-is)
```
