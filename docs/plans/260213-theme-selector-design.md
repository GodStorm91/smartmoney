# Theme Selector UI Design Specification

**Date**: 2026-02-13
**Status**: Draft
**Author**: UI/UX Designer
**Component**: `ThemeSelector` in `AppearanceSettings`

---

## 1. Overview

A theme preview card grid inserted between "Theme Mode" and "Accent Color" in `AppearanceSettings.tsx`. Each card renders a mini app mockup showing how the theme looks, letting users preview before committing. Selecting a non-default theme hides the accent color picker and auto-sets light/dark mode.

---

## 2. Component Hierarchy

```
AppearanceSettings
  |-- ThemeMode selector (existing, modified: disabled when non-default theme active)
  |-- ThemeSelector (NEW)
  |     |-- ThemePreviewCard[] (grid of 7 cards)
  |           |-- ThemePreviewMockup (mini app preview)
  |           |-- ThemeName label
  |           |-- ThemeBadge ("Light" / "Dark" pill)
  |-- AccentColor picker (existing, conditionally hidden)
  |-- TierSelection (existing, unchanged)
```

**New files:**
- `frontend/src/components/settings/ThemeSelector.tsx` -- main grid + card component

**Modified files:**
- `frontend/src/components/settings/AppearanceSettings.tsx` -- integrate ThemeSelector, conditional accent color visibility, theme mode disable state
- `frontend/src/contexts/ThemeContext.tsx` -- add `colorTheme` state + `setColorTheme` method

---

## 3. Theme Catalog

Each theme entry contains colors used for the preview card mockup and for the actual CSS variable overrides.

| Theme | Variant | Background | Surface | Header/Sidebar | Primary/Accent | Text | Subtext |
|---|---|---|---|---|---|---|---|
| Default | auto | (follows system) | white / gray-800 | primary-600 | accent color | gray-900 / gray-100 | gray-500 |
| Catppuccin Latte | light | `#eff1f5` | `#e6e9ef` | `#dce0e8` | `#8839ef` (Mauve) | `#4c4f69` | `#6c6f85` |
| Catppuccin Frappe | dark | `#303446` | `#292c3c` | `#232634` | `#ca9ee6` (Mauve) | `#c6d0f5` | `#a5adce` |
| Catppuccin Macchiato | dark | `#24273a` | `#1e2030` | `#181926` | `#c6a0f6` (Mauve) | `#cad3f5` | `#a5adcb` |
| Catppuccin Mocha | dark | `#1e1e2e` | `#181825` | `#11111b` | `#cba6f7` (Mauve) | `#cdd6f4` | `#a6adc8` |
| Dracula | dark | `#282a36` | `#21222c` | `#191a21` | `#bd93f9` (Purple) | `#f8f8f2` | `#6272a4` |
| Dracula Light | light | `#f8f8f2` | `#ffffff` | `#e8e8e2` | `#9754e8` | `#282a36` | `#6272a4` |

---

## 4. Layout

### Responsive Grid
```
Mobile  (<768px):  grid-cols-2  gap-3
Tablet  (>=768px): grid-cols-3  gap-3
Desktop (>=768px): grid-cols-3  gap-3  (same as tablet -- max-w-2xl container)
```

The container already sits inside `max-w-2xl mx-auto` from Settings page, so 3 columns is the practical max.

### Card Dimensions
- Width: fills grid cell (fluid)
- Height: auto, driven by content
- Padding: `p-1.5` outer frame, `p-0` mockup area
- Border radius: `rounded-xl` (12px) outer, `rounded-lg` (8px) inner mockup

---

## 5. Theme Preview Card Design

Each card is a clickable button containing a **mini app mockup** that gives a genuine feel for the theme.

### Card Structure (top to bottom)

```
+------------------------------------------+
|  [Mini App Mockup]                       |
|  +--------------------------------------+|
|  | Header bar (dark strip, 24px)        ||
|  |   [circle] [==== title ====]         ||
|  |--------------------------------------|
|  | Sidebar | Content area               ||
|  | [---]   | [card] [card]              ||
|  | [---]   | [====text====]             ||
|  | [---]   | [progress bar===]          ||
|  +--------------------------------------+|
|                                          |
|  Theme Name          [Light/Dark badge]  |
+------------------------------------------+
```

### Mockup Elements (all decorative, no real text)

1. **Header bar**: 24px tall rectangle using theme's header color. Contains a small circle (12px, accent color) simulating a logo, and a rounded rect (accent-colored, 40% width) simulating nav.

2. **Content area**: Theme background color fill. Contains:
   - Two small rounded rects side by side (surface color, simulating cards)
   - A thin horizontal line (subtext color, simulating text)
   - A progress bar: thin rounded rect, partially filled with accent color

3. **Overall mockup**:
   - Fixed aspect ratio via `aspect-[4/3]` utility
   - `rounded-lg overflow-hidden` to clip contents
   - `border` using a subtle divider appropriate to theme lightness

### Card Frame

```
Unselected:
  border-2 border-gray-200 dark:border-gray-700
  bg-white dark:bg-gray-800
  rounded-xl p-1.5

Hover:
  border-gray-300 dark:border-gray-600
  shadow-md
  scale-[1.02] (via transition-transform)

Selected:
  ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900
  border-primary-500 dark:border-primary-400
  shadow-lg

Focus-visible:
  outline-none ring-2 ring-primary-500 ring-offset-2
```

### Theme Name + Badge Row
Below the mockup, a flex row:
- **Left**: Theme name, `text-xs font-medium text-gray-700 dark:text-gray-300`
- **Right**: Variant badge -- small pill `text-[10px] font-semibold px-1.5 py-0.5 rounded-full`
  - Light: `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
  - Dark: `bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`
  - Auto (Default theme): `bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400`

---

## 6. Interaction Design

### Theme Selection Flow

```
User clicks theme card
  |
  |--> If "Default" selected:
  |      - Show accent color picker
  |      - Enable theme mode selector (light/dark/system)
  |      - Remove theme CSS overrides, revert to accent color system
  |
  |--> If named theme selected (e.g. Catppuccin Mocha):
         - Hide accent color picker (with smooth height collapse animation)
         - Auto-set light/dark based on theme variant
         - Disable theme mode selector, show note "Controlled by theme"
         - Apply theme CSS variables to :root
```

### Theme Mode Disabled State

When a non-default theme is active, the theme mode buttons become visually disabled:
- `opacity-50 pointer-events-none` on the button grid
- Below the grid, a small info text: `text-xs text-gray-500 italic` saying "Controlled by selected theme"

### Accent Color Conditional Visibility

When non-default theme active:
- Wrap the accent color section in a container with `max-h-0 overflow-hidden opacity-0 transition-all duration-300`
- When default: `max-h-[200px] opacity-100`
- This creates a smooth collapse/expand animation

### Keyboard Navigation

- Cards are `<button>` elements, naturally focusable
- Arrow key navigation within the grid (optional enhancement, not MVP)
- `role="radiogroup"` on the grid container, `role="radio"` + `aria-checked` on each card
- `aria-label="Select [Theme Name] theme"` on each card

---

## 7. Animation & Transitions

| Element | Property | Duration | Easing |
|---|---|---|---|
| Card hover scale | transform | 150ms | ease-out |
| Card hover shadow | box-shadow | 200ms | ease-out |
| Selection ring | ring, border | 200ms | ease-out |
| Accent color section collapse | max-height, opacity | 300ms | ease-in-out |
| Theme mode disabled fade | opacity | 200ms | ease-out |

All animations respect `prefers-reduced-motion: reduce` (already handled globally in index.css).

---

## 8. ThemeContext Changes

### New State

```typescript
export type ColorTheme =
  | 'default'
  | 'catppuccin-latte'
  | 'catppuccin-frappe'
  | 'catppuccin-macchiato'
  | 'catppuccin-mocha'
  | 'dracula'
  | 'dracula-light'

// Add to context interface:
colorTheme: ColorTheme
setColorTheme: (theme: ColorTheme) => void
```

### Storage
- Key: `smartmoney-color-theme`
- Default: `'default'`

### Behavior on setColorTheme

```typescript
function setColorTheme(newTheme: ColorTheme) {
  setColorThemeState(newTheme)
  localStorage.setItem(COLOR_THEME_STORAGE_KEY, newTheme)

  if (newTheme !== 'default') {
    // Auto-set light/dark based on theme variant
    const variant = THEME_CATALOG[newTheme].variant
    setTheme(variant) // 'light' or 'dark'
    // Apply theme data attribute
    document.documentElement.setAttribute('data-theme', newTheme)
    // Remove accent override since theme controls colors
    document.documentElement.removeAttribute('data-accent')
  } else {
    // Restore accent color system
    document.documentElement.removeAttribute('data-theme')
    // Re-apply stored accent
    if (accentColor !== 'green') {
      document.documentElement.setAttribute('data-accent', accentColor)
    }
  }
}
```

### Theme CSS Application

Each theme applies via `[data-theme="catppuccin-mocha"]` selector in `index.css`, overriding the `--primary-*` HSL variables and adding new semantic variables:

```css
:root[data-theme="catppuccin-mocha"] {
  --primary-50: 267 83% 95%;
  --primary-100: 267 70% 85%;
  /* ... full palette derived from theme accent ... */
  --primary-500: 267 84% 81%;
  /* ... */

  --theme-bg: #1e1e2e;
  --theme-surface: #181825;
  --theme-header: #11111b;
  --theme-text: #cdd6f4;
  --theme-subtext: #a6adc8;
}
```

Tailwind classes for `bg-gray-50`, `bg-gray-800`, etc. can be overridden at the `@layer base` level using these variables for full theme coverage. This is the implementation engineer's concern (Task #3/#4).

---

## 9. Component Pseudocode / JSX Sketch

```tsx
// frontend/src/components/settings/ThemeSelector.tsx

import { useTheme, type ColorTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'

interface ThemeDefinition {
  id: ColorTheme
  name: string
  variant: 'light' | 'dark' | 'auto'
  colors: {
    bg: string        // background
    surface: string   // card/surface
    header: string    // header bar
    accent: string    // primary/accent
    text: string      // main text
    subtext: string   // secondary text
  }
}

const THEME_CATALOG: ThemeDefinition[] = [
  {
    id: 'default',
    name: 'Default',
    variant: 'auto',
    colors: {
      bg: '#f9fafb',       // gray-50
      surface: '#ffffff',
      header: '#16a34a',   // green-600 (default accent)
      accent: '#16a34a',
      text: '#111827',
      subtext: '#6b7280',
    },
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    variant: 'light',
    colors: {
      bg: '#eff1f5',
      surface: '#e6e9ef',
      header: '#dce0e8',
      accent: '#8839ef',
      text: '#4c4f69',
      subtext: '#6c6f85',
    },
  },
  {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappe',
    variant: 'dark',
    colors: {
      bg: '#303446',
      surface: '#292c3c',
      header: '#232634',
      accent: '#ca9ee6',
      text: '#c6d0f5',
      subtext: '#a5adce',
    },
  },
  {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    variant: 'dark',
    colors: {
      bg: '#24273a',
      surface: '#1e2030',
      header: '#181926',
      accent: '#c6a0f6',
      text: '#cad3f5',
      subtext: '#a5adcb',
    },
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    variant: 'dark',
    colors: {
      bg: '#1e1e2e',
      surface: '#181825',
      header: '#11111b',
      accent: '#cba6f7',
      text: '#cdd6f4',
      subtext: '#a6adc8',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    variant: 'dark',
    colors: {
      bg: '#282a36',
      surface: '#21222c',
      header: '#191a21',
      accent: '#bd93f9',
      text: '#f8f8f2',
      subtext: '#6272a4',
    },
  },
  {
    id: 'dracula-light',
    name: 'Dracula Light',
    variant: 'light',
    colors: {
      bg: '#f8f8f2',
      surface: '#ffffff',
      header: '#e8e8e2',
      accent: '#9754e8',
      text: '#282a36',
      subtext: '#6272a4',
    },
  },
]

export function ThemeSelector() {
  const { t } = useTranslation('common')
  const { colorTheme, setColorTheme } = useTheme()

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t('appearance.colorTheme', 'Color Theme')}
      </h4>
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
        role="radiogroup"
        aria-label={t('appearance.colorTheme', 'Color Theme')}
      >
        {THEME_CATALOG.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            isSelected={colorTheme === theme.id}
            onSelect={() => setColorTheme(theme.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface ThemePreviewCardProps {
  theme: ThemeDefinition
  isSelected: boolean
  onSelect: () => void
}

function ThemePreviewCard({ theme, isSelected, onSelect }: ThemePreviewCardProps) {
  const { colors, name, variant } = theme

  return (
    <button
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      aria-label={`Select ${name} theme`}
      className={cn(
        'group flex flex-col rounded-xl border-2 p-1.5 transition-all duration-200 text-left',
        isSelected
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 border-primary-500'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
      )}
    >
      {/* Mini App Mockup */}
      <div
        className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-black/5"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Header bar */}
        <div
          className="h-5 flex items-center gap-1.5 px-2"
          style={{ backgroundColor: colors.header }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: colors.accent }}
          />
          <div
            className="h-1.5 rounded-full flex-1 max-w-[40%]"
            style={{ backgroundColor: colors.accent, opacity: 0.6 }}
          />
        </div>

        {/* Content area */}
        <div className="p-2 space-y-1.5">
          {/* Two mini cards side by side */}
          <div className="flex gap-1.5">
            <div
              className="flex-1 h-5 rounded"
              style={{ backgroundColor: colors.surface }}
            />
            <div
              className="flex-1 h-5 rounded"
              style={{ backgroundColor: colors.surface }}
            />
          </div>

          {/* Text line */}
          <div
            className="h-1 rounded-full w-3/4"
            style={{ backgroundColor: colors.subtext, opacity: 0.5 }}
          />

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: colors.surface }}
          >
            <div
              className="h-full rounded-full w-3/5"
              style={{ backgroundColor: colors.accent }}
            />
          </div>
        </div>
      </div>

      {/* Theme name + variant badge */}
      <div className="flex items-center justify-between mt-2 px-0.5">
        <span className={cn(
          'text-xs font-medium',
          isSelected
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-600 dark:text-gray-400'
        )}>
          {name}
        </span>

        <VariantBadge variant={variant} />
      </div>
    </button>
  )
}

function VariantBadge({ variant }: { variant: 'light' | 'dark' | 'auto' }) {
  const styles = {
    light: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dark: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    auto: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  }

  const labels = { light: 'Light', dark: 'Dark', auto: 'Auto' }

  return (
    <span className={cn(
      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
      styles[variant]
    )}>
      {labels[variant]}
    </span>
  )
}
```

---

## 10. Modified AppearanceSettings Integration

```tsx
// AppearanceSettings.tsx -- updated structure

export function AppearanceSettings() {
  const { theme, setTheme, accentColor, setAccentColor, colorTheme, tier, setTier } = useTheme()
  const isThemedMode = colorTheme !== 'default'

  return (
    <div className="space-y-6">
      {/* Theme Mode -- disabled when non-default theme active */}
      <div className={cn(isThemedMode && 'opacity-50 pointer-events-none')}>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('appearance.themeMode', 'Theme Mode')}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {/* ... existing theme mode buttons unchanged ... */}
        </div>
        {isThemedMode && (
          <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-2">
            {t('appearance.controlledByTheme', 'Controlled by selected theme')}
          </p>
        )}
      </div>

      {/* Color Theme Selector (NEW) */}
      <ThemeSelector />

      {/* Accent Color -- hidden when non-default theme active */}
      <div className={cn(
        'transition-all duration-300 overflow-hidden',
        isThemedMode ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
      )}>
        {/* ... existing accent color picker unchanged ... */}
      </div>

      {/* Tier Selection -- unchanged */}
      {/* ... */}
    </div>
  )
}
```

---

## 11. Accessibility

| Requirement | Implementation |
|---|---|
| WCAG AA contrast | Preview mockups use actual theme colors; labels use standard gray text meeting 4.5:1 |
| Keyboard nav | All cards are `<button>`, focusable in tab order |
| ARIA roles | `role="radiogroup"` on grid, `role="radio"` + `aria-checked` on each card |
| Screen reader | `aria-label="Select [Theme Name] theme"` on each card |
| Focus indicator | `focus-visible:ring-2 ring-primary-500 ring-offset-2` |
| Reduced motion | Hover scale/shadow transitions covered by global `prefers-reduced-motion` rule in index.css |
| Touch targets | Cards fill grid cells, well above 44x44px minimum on mobile |

---

## 12. Visual Reference -- Card States

```
+------ UNSELECTED ------+    +------- SELECTED --------+    +-------- HOVER ---------+
| border-gray-200         |    | ring-2 ring-primary-500  |    | border-gray-300         |
| bg-white                |    | border-primary-500       |    | shadow-md               |
| no shadow               |    | shadow (inherent ring)   |    | scale-[1.02]            |
|                         |    |                          |    |                         |
| [mockup]                |    | [mockup]                 |    | [mockup]                |
|                         |    |                          |    |                         |
| Name            [Dark]  |    | Name            [Dark]   |    | Name            [Dark]  |
+-------------------------+    +--------------------------+    +-------------------------+
```

---

## 13. Edge Cases

1. **Default theme + dark mode**: Preview card for Default shows dark variant colors when user is in dark mode (dynamically read from current resolved theme).
2. **7 cards in 3-col grid**: Last row has 1 card on the left. Acceptable -- no special handling needed.
3. **7 cards in 2-col grid**: Last row has 1 card on the left. Acceptable.
4. **Theme persistence**: `colorTheme` stored in localStorage. On app load, if a theme is set, immediately apply `data-theme` attribute before React hydration to prevent flash.
5. **Theme + accent conflict**: When switching back to Default, restore the previously selected accent color from localStorage.

---

## 14. i18n Keys

Add to all 3 locale files (`en/ja/vi common.json`):

```json
{
  "appearance.colorTheme": "Color Theme",
  "appearance.controlledByTheme": "Controlled by selected theme",
  "appearance.themeDefault": "Default",
  "appearance.themeCatppuccinLatte": "Catppuccin Latte",
  "appearance.themeCatppuccinFrappe": "Catppuccin Frappe",
  "appearance.themeCatppuccinMacchiato": "Catppuccin Macchiato",
  "appearance.themeCatppuccinMocha": "Catppuccin Mocha",
  "appearance.themeDracula": "Dracula",
  "appearance.themeDraculaLight": "Dracula Light"
}
```

Japanese:
```json
{
  "appearance.colorTheme": "カラーテーマ",
  "appearance.controlledByTheme": "テーマによる自動設定",
  "appearance.themeDefault": "デフォルト"
}
```

Vietnamese:
```json
{
  "appearance.colorTheme": "Giao dien mau",
  "appearance.controlledByTheme": "Duoc dieu khien boi chu de"
}
```

(Theme brand names like "Catppuccin Mocha" and "Dracula" remain untranslated.)

---

## 15. Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| Mini app mockup instead of color swatches | Gives users genuine spatial preview of how the theme feels, not just isolated color dots. Award-winning theme selectors (VS Code, Obsidian) use this pattern. |
| Hide accent picker for themed modes | Themes define a cohesive palette -- exposing accent picker would break theme integrity. |
| Disable (not hide) theme mode toggle | Users should still see what mode they're in. Hiding it entirely would be confusing. |
| `aspect-[4/3]` for mockup | Provides enough vertical space for the mini layout while keeping cards compact in a 2-3 col grid. |
| Ring-based selection indicator | Consistent with existing accent color picker pattern (`ring-2 ring-gray-900`). |
| Variant badge (Light/Dark/Auto) | Users need to know at a glance which themes are dark-only vs light-only. Prevents surprise mode switches. |

---

## 16. Implementation Notes for Engineers

1. **ThemeContext changes** (Task #3): Add `colorTheme` + `setColorTheme` to context. Apply `data-theme` attribute on document root. Store in localStorage key `smartmoney-color-theme`.

2. **CSS variables** (Task #3): Add `[data-theme="..."]` selectors in `index.css` overriding `--primary-*` and adding `--theme-bg`, `--theme-surface`, `--theme-text`, `--theme-subtext` for full coverage. Also override Tailwind gray scale for themed modes.

3. **Component implementation** (Task #4): Use the `THEME_CATALOG` array and JSX sketch above as the starting point. The inline `style` props on mockup elements use hex colors from the catalog -- these are only for the preview card rendering, not for the actual theme application.

4. **Flash prevention**: In `index.html`, add a `<script>` block before React that reads `smartmoney-color-theme` from localStorage and applies `data-theme` attribute immediately, similar to the existing dark mode flash prevention.

5. **Tailwind `cn()` usage**: All conditional classes use the existing `cn()` utility from `@/utils/cn`.
