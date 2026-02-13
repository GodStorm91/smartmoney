# Phase 1: Design Analysis & Planning

**Date:** 2026-02-13
**Status:** Complete

---

## Context

Review existing chat implementation and theme system to identify enhancement opportunities.

---

## Current Implementation Analysis

### Chat Components Structure

**ChatPanel.tsx** (Main Container)
- Right-side slide-in panel (384px width, full height)
- Backdrop overlay with click-to-close
- Escape key support
- Message state in React (lost on close)
- Credit system integration

**ChatHeader.tsx**
- Title with Sparkles icon
- Credits display
- Close button
- Border separator

**ChatMessages.tsx**
- Scrollable message list
- Auto-scroll to bottom
- Empty state message
- Loading indicator (Loader2 icon)
- Message + ActionCard rendering

**ChatMessage.tsx**
- User/assistant avatars
- Message bubbles (rounded-2xl)
- Max-width constraint (80%)
- Role-based styling

**ChatInput.tsx**
- Auto-resize textarea (max 120px)
- Send button with icon
- Enter to send, Shift+Enter for newline
- Disabled state during loading

**ActionCard.tsx**
- Icon based on action type (Target/PieChart)
- Title + description
- Apply/Skip buttons
- Loading state with spinner

### Theme System

**Theme Types:**
- `ColorTheme`: 7 variants (default, catppuccin-latte/frappe/macchiato/mocha, dracula, dracula-light)
- `AccentColor`: 6 colors (green, blue, purple, orange, rose, teal)
- `Theme`: light/dark/system

**Implementation:**
- CSS custom properties (HSL format) in `index.css`
- `data-theme` attribute on `<html>` element
- `data-accent` attribute for accent color override
- ThemeContext provides theme state management
- Color palettes for --primary-50 through --primary-900
- Gray scale (--gray-50 through --gray-900) per theme

**Current Theme Coverage:**
- Catppuccin Latte: Light theme, purple accent, warm grays
- Catppuccin Frappe: Dark theme, lavender accent, cool grays
- Catppuccin Macchiato: Dark theme, mauve accent, deeper tones
- Catppuccin Mocha: Dark theme, strongest contrast
- Dracula: Dark theme, purple accent (#bd93f9)
- Dracula Light: Light theme, purple accent
- Default: Light/dark toggle, emerald green accent

---

## Identified Gaps & Opportunities

### Critical Issues

1. **Transform Direction Bug**
   - Current: `-translate-x-full` for right-side panel
   - Should be: `translate-x-full` (panel slides from right)
   - Impact: Panel animation incorrect

2. **Incomplete Theme Integration**
   - Chat components use hardcoded `dark:bg-gray-800` instead of theme variables
   - ActionCard colors not theme-aware
   - Message bubbles don't adapt to theme palettes

3. **No Parameter Preview in ActionCard**
   - Only shows action description (text)
   - User can't see what values will be applied
   - Need structured parameter display

### Medium Priority

4. **Limited Micro-Interactions**
   - No hover states on messages
   - No typing indicator animation
   - No send button pulse/haptic feedback

5. **Mobile Optimization Needed**
   - Panel width 100% on mobile (good)
   - But no mobile-specific optimizations
   - Touch targets could be larger

6. **No Markdown Support**
   - Messages render as plain text
   - AI responses may include formatting

### Low Priority

7. **Accessibility Enhancements**
   - Missing ARIA labels on some interactive elements
   - Focus trap not implemented in panel
   - Screen reader announcements for new messages

---

## Design Insights from Research

**From 02-current-implementation-analysis.md:**
- Credit-gated system (1 credit per message)
- Localization: ja/en/vi supported
- Action types: create_goal, create_budget (expandable)
- Query invalidation after action execution

**From design-guidelines.md:**
- Mobile-first approach (320px+)
- WCAG AA minimum (4.5:1 text, 3:1 UI)
- Touch targets ≥ 44x44px
- Animations respect prefers-reduced-motion
- Japanese text support (Noto Sans JP)

---

## Design Decisions

### 1. Theme Integration Strategy

**Approach:** Use CSS custom properties exclusively
- Replace `dark:bg-gray-800` → `bg-gray-800` (theme-aware via --gray-800)
- Use `bg-primary-500` for brand colors (adapts to accent + theme)
- Ensure all components reference CSS vars, not hardcoded hex

**Benefits:**
- Automatic theme switching
- No conditional class logic needed
- Consistent across all 7 themes

### 2. ActionCard Parameter Preview

**Design:** Structured key-value display
- Show all action payload parameters
- Format based on type (currency, date, text)
- Highlight changed/important values
- Collapsible for long payloads

**Example:**
```
[PieChart Icon] Create Budget
Generate monthly budget based on your income

Parameters:
• Monthly Income: ¥300,000
• Language: Japanese
• Feedback: More savings allocation

[Apply] [Skip]
```

### 3. Responsive Breakpoints

**Mobile (320px-767px):**
- Full-width panel
- Larger touch targets (48x48px)
- Simplified header (hide credits on narrow screens)

**Tablet (768px-1023px):**
- 448px width panel (w-112)
- Standard touch targets (44x44px)

**Desktop (1024px+):**
- 384px width panel (w-96, current)
- Hover states enabled

### 4. Micro-Interactions

**High Impact, Low Cost:**
- Send button: Scale pulse on hover (transform: scale(1.05))
- Message appear: Fade + slide-up animation (20ms stagger)
- ActionCard: Border glow on hover
- Typing indicator: 3-dot bounce animation

**Performance:**
- Use transform/opacity only (GPU-accelerated)
- requestAnimationFrame for scroll
- CSS transitions <300ms

---

## Technical Architecture

### Component Structure (Updated)

```
ChatPanel/
├── ChatHeader       → Theme-aware header
├── ChatMessages     → Message container with animations
│   ├── ChatMessage    → Theme-aware bubbles
│   └── ActionCard     → Enhanced with parameter preview
└── ChatInput        → Theme-aware input field
```

### Theme Integration Points

1. **Background Colors:** Use --gray-* scale
2. **Text Colors:** Use --gray-* for body, white/current for emphasis
3. **Brand Colors:** Use --primary-* scale
4. **Borders:** Use --gray-200/--gray-700 (theme-aware)
5. **Shadows:** Adjust opacity based on theme (light: dark shadow, dark: lighter shadow)

### Accessibility Requirements

- Focus visible indicator (2px solid primary-500, 2px offset)
- Escape key to close (✓ implemented)
- Focus trap within panel when open
- ARIA live region for new messages
- Semantic HTML (nav, main, button, etc.)
- Skip link to input field

---

## Related Files

**Component Files:**
- `/frontend/src/components/chat/ChatPanel.tsx`
- `/frontend/src/components/chat/ChatHeader.tsx`
- `/frontend/src/components/chat/ChatMessages.tsx`
- `/frontend/src/components/chat/ChatMessage.tsx`
- `/frontend/src/components/chat/ChatInput.tsx`
- `/frontend/src/components/chat/ActionCard.tsx`

**Theme Files:**
- `/frontend/src/contexts/ThemeContext.tsx`
- `/frontend/src/hooks/useTheme.ts`
- `/frontend/src/index.css`

**Design Docs:**
- `/docs/design-guidelines.md`
- `/docs/plans/260213-ai-chat-assistant-research/`

---

## Next Steps

Phase 2: Component design with theme integration and parameter preview UI
