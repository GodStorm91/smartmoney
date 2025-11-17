# SmartMoney Design Guidelines

**Last Updated**: 2025-11-17
**Version**: 1.0
**Status**: Active

---

## Overview

SmartMoney is a personal finance cashflow tracker webapp for Japanese market. Design emphasizes clarity, trust, professionalism while maintaining modern aesthetics.

**Design Philosophy**: Clean, data-focused, mobile-first, accessible, conversion-optimized.

**Inspiration**: Award-winning finance dashboards (Dribbble/Behance), Japanese apps (Zaim), 2025 dashboard trends.

---

## Design System Documentation

### Core System
- **[Typography System](design/typography-system.md)** - Noto Sans JP, Inter, type scale, Japanese text, number/date formatting
- **[Color Palette](design/color-palette.md)** - Primary, semantic (income/expense/net), neutral, usage rules
- **[Layout & Spacing](design/layout-spacing.md)** - 8px grid, breakpoints, Bento grid, responsive patterns
- **[Component Patterns](design/component-patterns.md)** - Buttons, cards, forms, tables, charts, badges, icons, states
- **[Accessibility Standards](design/accessibility-standards.md)** - WCAG AA, ARIA, keyboard nav, screen readers
- **[Animations & Micro-Interactions](design/animations-micro-interactions.md)** - Timing, easing, transitions, performance

---

## Quick Reference

### Typography
```
Primary:   Noto Sans JP (Japanese support)
Numbers:   Inter (tabular figures)
Monospace: Roboto Mono (CSV preview)
Base:      16px, line-height 1.6-1.8
```

### Colors (Semantic)
```
Income:    #4CAF50 (Green) - Always consistent
Expense:   #F44336 (Red)
Net:       #2196F3 (Blue)
Primary:   #4CAF50 (Brand)
Page BG:   #FAFAFA
Card BG:   #FFFFFF
```

### Spacing (8px base)
```
Card padding:     24px (p-6)
Button padding:   12px 24px (py-3 px-6)
Section gap:      48px (gap-12)
Container:        16px mobile, 24px tablet, 32px desktop
```

### Breakpoints
```
Mobile:    320px - 639px  (default)
Tablet:    768px - 1023px (md:)
Desktop:   1024px+        (lg:)
```

### Component States
```
Hover:    150-250ms ease-out
Focus:    2px solid primary-500, offset 2px
Active:   50-100ms
Disabled: opacity 0.6, gray-400
```

---

## Design Principles

1. **Mobile-First**: Design mobile (320px) → scale up
2. **Accessibility**: WCAG AA minimum (4.5:1 text, 3:1 UI)
3. **Consistency**: Income=green, Expense=red, Net=blue everywhere
4. **Performance**: GPU-accelerated animations, optimized assets
5. **Clarity**: Data-focused, clear hierarchy, minimal decoration
6. **Localization**: Japanese primary, proper character support

---

## Key Patterns

### Dashboard Layout (Bento Grid)
```
Desktop (3-4 cols): Asymmetric cards, featured spans 2 cols
Tablet (2 cols):    Mixed card sizes
Mobile (1 col):     Stacked cards
```

### Financial Data Display
- KPIs: Large numbers (42px Inter), icon, label, trend
- Charts: Recharts with consistent colors, responsive
- Tables: Right-align amounts, hover states, mobile cards

### Status Indicators
```
Ahead:     Green, ↗ icon
On-track:  Blue, → icon
Behind:    Red, ↘ icon
```

---

## Brand Identity

**Logo**: Minimalist upward arrow + yen symbol (¥)
**Colors**: Primary green (#4CAF50) + gray (#424242)
**Voice**: Professional, encouraging, trustworthy, jargon-free
**Tagline**: "Track your cashflow, reach your goals"

---

## Design Checklist

Before finalizing screens:
- [ ] Typography hierarchy clear (H1 > H2 > H3)
- [ ] Color contrast WCAG AA (4.5:1 normal, 3:1 large/UI)
- [ ] Spacing consistent (8px grid)
- [ ] States defined (hover, focus, active, disabled, loading, empty, error)
- [ ] Responsive tested (320px, 768px, 1024px+)
- [ ] ARIA labels for dynamic content
- [ ] Touch targets ≥ 44x44px mobile
- [ ] Focus indicators visible
- [ ] Respects prefers-reduced-motion
- [ ] Japanese text renders correctly
- [ ] Numbers formatted with locale (¥, commas)

---

## Resources

**Inspiration**:
- Dribbble: [Financial Dashboard](https://dribbble.com/tags/financial_dashboard)
- Behance: [Finance Dashboard](https://www.behance.net/search/projects/finance%20dashboard)

**Tools**:
- Fonts: Google Fonts (Noto Sans JP, Inter)
- Icons: Heroicons v2
- Charts: Recharts
- CSS: Tailwind CSS

**References**:
- Zaim (Japanese finance app, Good Design Award)
- MoneyForward (Japanese finance management)
- 2025 Dashboard Trends: AI personalization, mobile-first, minimalist colors

---

## Japanese UI Labels

```
Dashboard:      ダッシュボード
Upload:         アップロード
Transactions:   取引履歴
Analytics:      分析
Goals:          目標
Settings:       設定
Income:         収入
Expense:        支出
Net:            差額
Category:       カテゴリー
Date:           日付
Amount:         金額
Filter:         フィルター
```

---

## Next Steps

1. Review wireframes (docs/wireframes/*.html)
2. Validate with ai-multimodal skill
3. Implement with Tailwind CSS
4. Test accessibility (keyboard, screen reader, contrast)
5. Update guidelines based on implementation feedback
