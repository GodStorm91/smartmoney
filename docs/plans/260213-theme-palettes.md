# Theme Palettes — CSS Variable Definitions

> Generated 2026-02-13. All hex values sourced from official repos.
> HSL format: `H S% L%` (no `hsl()` wrapper), matching existing `--primary-*` pattern.

## Sources

- **Catppuccin**: [catppuccin.com/palette](https://catppuccin.com/palette/) / [GitHub](https://github.com/catppuccin/catppuccin)
- **Dracula**: [draculatheme.com/spec](https://draculatheme.com/spec) (Classic + Alucard light variant)

---

## Table of Contents

1. [Catppuccin Latte (light)](#1-catppuccin-latte-light)
2. [Catppuccin Frappe (dark)](#2-catppuccin-frappe-dark)
3. [Catppuccin Macchiato (dark)](#3-catppuccin-macchiato-dark)
4. [Catppuccin Mocha (dark)](#4-catppuccin-mocha-dark)
5. [Dracula (dark)](#5-dracula-dark)
6. [Dracula Light / Alucard (light)](#6-dracula-light--alucard)
7. [Implementation Notes](#7-implementation-notes)

---

## 1. Catppuccin Latte (light)

**Mode:** `light` | **Accent source:** Mauve `#8839ef`

### Primary scale (Mauve)

```css
--primary-50: 266 55% 96%;
--primary-100: 266 65% 90%;
--primary-200: 266 75% 80%;
--primary-300: 266 85% 70%;
--primary-400: 266 85% 60%;
--primary-500: 266 85% 58%;   /* official Mauve #8839ef */
--primary-600: 266 85% 43%;
--primary-700: 266 90% 36%;
--primary-800: 266 90% 29%;
--primary-900: 266 90% 22%;
```

### Surface / background colors

| Variable | HSL | Hex | Catppuccin name |
|---|---|---|---|
| `--theme-base` | 220 23% 95% | #eff1f5 | Base |
| `--theme-mantle` | 220 22% 92% | #e6e9ef | Mantle |
| `--theme-crust` | 220 21% 89% | #dce0e8 | Crust |
| `--theme-surface0` | 223 16% 83% | #ccd0da | Surface0 |
| `--theme-surface1` | 225 14% 77% | #bcc0cc | Surface1 |
| `--theme-surface2` | 227 12% 71% | #acb0be | Surface2 |
| `--theme-overlay0` | 228 11% 65% | #9ca0b0 | Overlay0 |
| `--theme-overlay1` | 231 10% 59% | #8c8fa1 | Overlay1 |
| `--theme-text` | 234 16% 35% | #4c4f69 | Text |
| `--theme-subtext1` | 233 13% 41% | #5c5f77 | Subtext1 |
| `--theme-subtext0` | 233 10% 47% | #6c6f85 | Subtext0 |

### Semantic accent colors (reference)

| Name | Hex | HSL |
|---|---|---|
| Rosewater | #dc8a78 | 11 59% 67% |
| Flamingo | #dd7878 | 0 60% 67% |
| Pink | #ea76cb | 316 73% 69% |
| Mauve | #8839ef | 266 85% 58% |
| Red | #d20f39 | 347 87% 44% |
| Maroon | #e64553 | 355 76% 59% |
| Peach | #fe640b | 22 99% 52% |
| Yellow | #df8e1d | 35 77% 49% |
| Green | #40a02b | 109 58% 40% |
| Teal | #179299 | 183 74% 35% |
| Sky | #04a5e5 | 197 97% 46% |
| Sapphire | #209fb5 | 189 70% 42% |
| Blue | #1e66f5 | 220 91% 54% |
| Lavender | #7287fd | 231 97% 72% |

---

## 2. Catppuccin Frappe (dark)

**Mode:** `dark` | **Accent source:** Mauve `#ca9ee6`

### Primary scale (Mauve)

```css
--primary-50: 277 30% 95%;
--primary-100: 277 44% 88%;
--primary-200: 277 59% 80%;
--primary-300: 277 59% 72%;
--primary-400: 277 59% 64%;
--primary-500: 277 59% 56%;
--primary-600: 277 59% 48%;
--primary-700: 277 64% 40%;
--primary-800: 277 64% 32%;
--primary-900: 277 64% 24%;
```

### Surface / background colors

| Variable | HSL | Hex | Catppuccin name |
|---|---|---|---|
| `--theme-base` | 229 19% 23% | #303446 | Base |
| `--theme-mantle` | 231 19% 20% | #292c3c | Mantle |
| `--theme-crust` | 229 20% 17% | #232634 | Crust |
| `--theme-surface0` | 230 16% 30% | #414559 | Surface0 |
| `--theme-surface1` | 227 15% 37% | #51576d | Surface1 |
| `--theme-surface2` | 228 13% 44% | #626880 | Surface2 |
| `--theme-overlay0` | 229 13% 52% | #737994 | Overlay0 |
| `--theme-overlay1` | 227 17% 58% | #838ba7 | Overlay1 |
| `--theme-text` | 227 70% 87% | #c6d0f5 | Text |
| `--theme-subtext1` | 227 44% 80% | #b5bfe2 | Subtext1 |
| `--theme-subtext0` | 228 29% 73% | #a5adce | Subtext0 |

### Semantic accent colors (reference)

| Name | Hex | HSL |
|---|---|---|
| Rosewater | #f2d5cf | 10 57% 88% |
| Flamingo | #eebebe | 0 59% 84% |
| Pink | #f4b8e4 | 316 73% 84% |
| Mauve | #ca9ee6 | 277 59% 76% |
| Red | #e78284 | 359 68% 71% |
| Maroon | #ea999c | 358 66% 76% |
| Peach | #ef9f76 | 20 79% 70% |
| Yellow | #e5c890 | 40 62% 73% |
| Green | #a6d189 | 96 44% 68% |
| Teal | #81c8be | 172 39% 65% |
| Sky | #99d1db | 189 48% 73% |
| Sapphire | #85c1dc | 199 55% 69% |
| Blue | #8caaee | 222 74% 74% |
| Lavender | #babbf1 | 239 66% 84% |

---

## 3. Catppuccin Macchiato (dark)

**Mode:** `dark` | **Accent source:** Mauve `#c6a0f6`

### Primary scale (Mauve)

```css
--primary-50: 267 53% 95%;
--primary-100: 267 68% 88%;
--primary-200: 267 83% 80%;
--primary-300: 267 83% 72%;
--primary-400: 267 83% 64%;
--primary-500: 267 83% 56%;
--primary-600: 267 83% 48%;
--primary-700: 267 88% 40%;
--primary-800: 267 88% 32%;
--primary-900: 267 88% 24%;
```

### Surface / background colors

| Variable | HSL | Hex | Catppuccin name |
|---|---|---|---|
| `--theme-base` | 232 23% 18% | #24273a | Base |
| `--theme-mantle` | 233 23% 15% | #1e2030 | Mantle |
| `--theme-crust` | 236 23% 12% | #181926 | Crust |
| `--theme-surface0` | 230 19% 26% | #363a4f | Surface0 |
| `--theme-surface1` | 231 16% 34% | #494d64 | Surface1 |
| `--theme-surface2` | 230 14% 41% | #5b6078 | Surface2 |
| `--theme-overlay0` | 230 12% 49% | #6e738d | Overlay0 |
| `--theme-overlay1` | 228 15% 57% | #8087a2 | Overlay1 |
| `--theme-text` | 227 68% 88% | #cad3f5 | Text |
| `--theme-subtext1` | 228 39% 80% | #b8c0e0 | Subtext1 |
| `--theme-subtext0` | 227 27% 72% | #a5adcb | Subtext0 |

### Semantic accent colors (reference)

| Name | Hex | HSL |
|---|---|---|
| Rosewater | #f4dbd6 | 10 58% 90% |
| Flamingo | #f0c6c6 | 0 58% 86% |
| Pink | #f5bde6 | 316 74% 85% |
| Mauve | #c6a0f6 | 267 83% 80% |
| Red | #ed8796 | 351 74% 73% |
| Maroon | #ee99a0 | 355 71% 77% |
| Peach | #f5a97f | 21 86% 73% |
| Yellow | #eed49f | 40 70% 78% |
| Green | #a6da95 | 105 48% 72% |
| Teal | #8bd5ca | 171 47% 69% |
| Sky | #91d7e3 | 189 59% 73% |
| Sapphire | #7dc4e4 | 199 66% 69% |
| Blue | #8aadf4 | 220 83% 75% |
| Lavender | #b7bdf8 | 234 82% 85% |

---

## 4. Catppuccin Mocha (dark)

**Mode:** `dark` | **Accent source:** Mauve `#cba6f7`

### Primary scale (Mauve)

```css
--primary-50: 267 54% 95%;
--primary-100: 267 69% 88%;
--primary-200: 267 84% 80%;
--primary-300: 267 84% 72%;
--primary-400: 267 84% 64%;
--primary-500: 267 84% 56%;
--primary-600: 267 84% 48%;
--primary-700: 267 89% 40%;
--primary-800: 267 89% 32%;
--primary-900: 267 89% 24%;
```

### Surface / background colors

| Variable | HSL | Hex | Catppuccin name |
|---|---|---|---|
| `--theme-base` | 240 21% 15% | #1e1e2e | Base |
| `--theme-mantle` | 240 21% 12% | #181825 | Mantle |
| `--theme-crust` | 240 23% 9% | #11111b | Crust |
| `--theme-surface0` | 237 16% 23% | #313244 | Surface0 |
| `--theme-surface1` | 234 13% 31% | #45475a | Surface1 |
| `--theme-surface2` | 232 12% 39% | #585b70 | Surface2 |
| `--theme-overlay0` | 231 11% 47% | #6c7086 | Overlay0 |
| `--theme-overlay1` | 230 13% 55% | #7f849c | Overlay1 |
| `--theme-text` | 226 64% 88% | #cdd6f4 | Text |
| `--theme-subtext1` | 227 35% 80% | #bac2de | Subtext1 |
| `--theme-subtext0` | 228 24% 72% | #a6adc8 | Subtext0 |

### Semantic accent colors (reference)

| Name | Hex | HSL |
|---|---|---|
| Rosewater | #f5e0dc | 10 56% 91% |
| Flamingo | #f2cdcd | 0 59% 88% |
| Pink | #f5c2e7 | 316 72% 86% |
| Mauve | #cba6f7 | 267 84% 81% |
| Red | #f38ba8 | 343 81% 75% |
| Maroon | #eba0ac | 350 65% 77% |
| Peach | #fab387 | 23 92% 75% |
| Yellow | #f9e2af | 41 86% 83% |
| Green | #a6e3a1 | 115 54% 76% |
| Teal | #94e2d5 | 170 57% 73% |
| Sky | #89dceb | 189 71% 73% |
| Sapphire | #74c7ec | 198 76% 69% |
| Blue | #89b4fa | 217 92% 76% |
| Lavender | #b4befe | 232 97% 85% |

---

## 5. Dracula (dark)

**Mode:** `dark` | **Accent source:** Purple `#BD93F9`

### Primary scale (Purple)

```css
--primary-50: 265 59% 95%;
--primary-100: 265 74% 88%;
--primary-200: 265 89% 80%;
--primary-300: 265 89% 72%;
--primary-400: 265 89% 64%;
--primary-500: 265 89% 56%;
--primary-600: 265 89% 48%;
--primary-700: 265 94% 40%;
--primary-800: 265 94% 32%;
--primary-900: 265 94% 24%;
```

### Surface / background colors

| Variable | HSL | Hex | Dracula name |
|---|---|---|---|
| `--theme-base` | 231 15% 18% | #282A36 | Background |
| `--theme-mantle` | 235 14% 15% | #21222C | Background Dark |
| `--theme-crust` | 232 14% 11% | #191A21 | Background Darker |
| `--theme-surface0` | 232 14% 31% | #44475A | Current Line / Selection |
| `--theme-surface1` | 230 15% 24% | #343746 | Background Light |
| `--theme-surface2` | 231 10% 29% | #424450 | Background Lighter |
| `--theme-overlay0` | 225 27% 51% | #6272A4 | Comment |
| `--theme-overlay1` | 225 27% 60% | — | Comment (lighter) |
| `--theme-text` | 60 30% 96% | #F8F8F2 | Foreground |
| `--theme-subtext1` | 60 20% 88% | — | Foreground dimmed |
| `--theme-subtext0` | 60 10% 75% | — | Foreground muted |

### Semantic accent colors (reference)

| Name | Hex | HSL |
|---|---|---|
| Purple | #BD93F9 | 265 89% 78% |
| Pink | #FF79C6 | 326 100% 74% |
| Cyan | #8BE9FD | 191 97% 77% |
| Green | #50FA7B | 135 94% 65% |
| Orange | #FFB86C | 31 100% 71% |
| Yellow | #F1FA8C | 65 92% 76% |
| Red | #FF5555 | 0 100% 67% |

---

## 6. Dracula Light / Alucard

**Mode:** `light` | **Accent source:** Purple `#644AC9`

### Primary scale (Purple)

```css
--primary-50: 252 30% 96%;
--primary-100: 252 35% 90%;
--primary-200: 252 44% 80%;
--primary-300: 252 54% 70%;
--primary-400: 252 54% 60%;
--primary-500: 252 54% 54%;   /* official Alucard Purple #644AC9 */
--primary-600: 252 54% 43%;
--primary-700: 252 59% 36%;
--primary-800: 252 59% 29%;
--primary-900: 252 59% 22%;
```

### Surface / background colors

| Variable | HSL | Hex | Dracula/Alucard name |
|---|---|---|---|
| `--theme-base` | 48 100% 96% | #FFFBEB | Background |
| `--theme-mantle` | 54 37% 90% | #EFEDDC | Background Light |
| `--theme-crust` | 46 25% 90% | #ECE9DF | Background Lighter |
| `--theme-surface0` | 52 19% 84% | #DEDCCF | Current Line |
| `--theme-surface1` | 51 13% 78% | #CECCC0 | Background Dark |
| `--theme-surface2` | 47 6% 72% | #BCBAB3 | Background Darker |
| `--theme-overlay0` | 49 18% 36% | #6C664B | Comment |
| `--theme-overlay1` | 49 14% 46% | — | Comment (lighter) |
| `--theme-text` | 0 0% 12% | #1F1F1F | Foreground |
| `--theme-subtext1` | 0 0% 22% | — | Foreground dimmed |
| `--theme-subtext0` | 0 0% 35% | — | Foreground muted |

### Semantic accent colors (reference)

| Name | Hex | HSL |
|---|---|---|
| Purple | #644AC9 | 252 54% 54% |
| Pink | #A3144D | 336 78% 36% |
| Cyan | #036A96 | 198 96% 30% |
| Green | #14710A | 114 84% 24% |
| Orange | #A34D14 | 24 78% 36% |
| Yellow | #846E15 | 48 73% 30% |
| Red | #CB3A2A | 6 66% 48% |

---

## 7. Implementation Notes

### CSS variable naming

All `--theme-*` variables are NEW and need to be introduced into the system. They serve as the surface/background layer that overrides Tailwind's gray scale. The `--primary-*` variables already exist and just need new values per theme.

### Suggested `data-theme` attribute values

| Attribute value | Mode | Description |
|---|---|---|
| `catppuccin-latte` | light | Warm pastel light |
| `catppuccin-frappe` | dark | Muted dark |
| `catppuccin-macchiato` | dark | Medium-contrast dark |
| `catppuccin-mocha` | dark | Deep dark (original) |
| `dracula` | dark | Classic Dracula |
| `dracula-light` | light | Alucard light variant |

### How themes interact with existing accent system

Current app has `data-accent` for accent color (emerald, blue, purple, orange, rose, teal). Theme palettes REPLACE both:
1. The `--primary-*` scale (accent) — from the theme's signature color
2. The gray/surface scale — via new `--theme-*` variables

When a theme is active, the `data-accent` selector should be ignored (theme takes precedence). When theme is "default" / none, the existing `data-accent` system stays in control.

### Gray scale override strategy

The app uses Tailwind `gray-*` classes (`bg-gray-50`, `bg-gray-900`, `text-gray-*`, `border-gray-*`). To apply theme surface colors without rewriting every component, override Tailwind's gray palette in `tailwind.config`:

```js
// In tailwind.config.js, when theme is active:
gray: {
  50:  'hsl(var(--theme-base) / <alpha-value>)',
  100: 'hsl(var(--theme-mantle) / <alpha-value>)',
  200: 'hsl(var(--theme-surface0) / <alpha-value>)',
  300: 'hsl(var(--theme-surface1) / <alpha-value>)',
  400: 'hsl(var(--theme-surface2) / <alpha-value>)',
  500: 'hsl(var(--theme-overlay0) / <alpha-value>)',
  600: 'hsl(var(--theme-overlay1) / <alpha-value>)',
  700: 'hsl(var(--theme-subtext0) / <alpha-value>)',
  800: 'hsl(var(--theme-subtext1) / <alpha-value>)',
  900: 'hsl(var(--theme-text) / <alpha-value>)',
}
```

**Alternative (simpler):** Define `--theme-*` vars, then in CSS set `--tw-gray-*` custom properties that Tailwind reads. This avoids touching the config and works at runtime.

### Surface variable mapping for dark vs light

For **dark themes** (Mocha, Macchiato, Frappe, Dracula):
- `--theme-base` = darkest (main bg)
- `--theme-surface0` = card bg (slightly lighter)
- `--theme-text` = lightest (near-white)

For **light themes** (Latte, Alucard):
- `--theme-base` = lightest (main bg)
- `--theme-surface0` = card bg (slightly darker)
- `--theme-text` = darkest (near-black)

This is consistent with how `bg-gray-50`/`bg-gray-900` already flips in dark mode.

### Unresolved Questions

1. Should users be able to combine a theme (e.g., Catppuccin Mocha) with a different accent color (e.g., Blue instead of Mauve)? Catppuccin supports multiple accent colors per flavor — could offer accent sub-selection within a theme.
2. The Dracula subtext/overlay1 values marked "—" in hex column were interpolated (not official hex). Verify these look correct visually before shipping.
3. Alucard (Dracula Light) has warm yellow-tinted backgrounds (`48 100% 96%`). This is noticeably different from the cool-toned Catppuccin Latte. Confirm this is the desired aesthetic or consider a neutral-toned Dracula light variant.
