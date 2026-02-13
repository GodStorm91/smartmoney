# Phase 2: Component Design & Enhancement

**Date:** 2026-02-13
**Status:** In Progress

---

## Overview

Design and implement theme-aware chat components with enhanced ActionCard parameter preview.

---

## Component Specifications

### 1. Enhanced ActionCard

**Purpose:** Display AI-suggested actions with clear parameter preview

**Visual Design:**
- Theme-aware background (primary-50/primary-900 with opacity)
- Icon + title + description
- Structured parameter list
- Apply/Skip buttons with loading states

**Parameter Display Format:**
```typescript
interface ParameterDisplay {
  label: string        // Localized field name
  value: string | number
  format?: 'currency' | 'date' | 'text' | 'number'
  highlight?: boolean  // Highlight important params
}
```

**Formatting Rules:**
- Currency: Format with locale (¥300,000 for ja, $3,000 for en, ₫300,000 for vi)
- Dates: Use locale date format
- Numbers: Add thousand separators
- Text: Truncate if >50 chars with ellipsis

**Theme Integration:**
- Use `bg-primary-50 dark:bg-primary-900/20` (theme-aware)
- Border: `border-primary-200 dark:border-primary-700`
- Text: `text-gray-900 dark:text-white`

---

### 2. Theme-Aware ChatMessage

**Current Issues:**
- Hardcoded colors: `bg-gray-100 dark:bg-gray-700`
- Not adapting to Catppuccin/Dracula themes

**Solution:**
- Use CSS custom properties from theme system
- Remove `dark:` prefixes where theme handles it
- Ensure contrast ratios meet WCAG AA

**User Message Bubble:**
- Background: `bg-primary-500` (theme primary)
- Text: `text-white`
- Border radius: `rounded-2xl rounded-br-md` (tail on bottom-right)

**Assistant Message Bubble:**
- Background: `bg-gray-100 dark:bg-gray-700` → Keep (works with themes)
- Text: `text-gray-900 dark:text-white`
- Border radius: `rounded-2xl rounded-bl-md` (tail on bottom-left)

---

### 3. ChatPanel Layout

**Fix Transform Bug:**
```tsx
// Before:
isOpen ? 'translate-x-0' : '-translate-x-full'

// After:
isOpen ? 'translate-x-0' : 'translate-x-full'
```

**Responsive Width:**
- Mobile (<640px): `w-full`
- Tablet (640px-1024px): `w-[448px]`
- Desktop (1024px+): `w-96` (384px)

**Theme-Aware Styling:**
- Background: `bg-white dark:bg-gray-800` (auto-adjusts per theme)
- Shadow: `shadow-2xl` (Tailwind handles theme-aware shadows)

---

### 4. Micro-Interactions

**Message Appear Animation:**
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter {
  animation: slideUp 200ms ease-out;
}
```

**Send Button Pulse:**
```tsx
className={cn(
  'p-2 rounded-full transition-all duration-200',
  'hover:scale-105 active:scale-95',
  !disabled && 'hover:shadow-lg'
)}
```

**ActionCard Hover:**
```tsx
className={cn(
  'border transition-all duration-200',
  'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600'
)}
```

---

## Implementation Tasks

### Task 1: Update ActionCard Component ✅

**File:** `frontend/src/components/chat/ActionCard.tsx`

**Changes:**
1. Add parameter preview rendering
2. Format parameters by type (currency/date/number)
3. Use i18n for parameter labels
4. Theme-aware colors
5. Add hover micro-interaction

### Task 2: Fix ChatPanel Transform Bug ✅

**File:** `frontend/src/components/chat/ChatPanel.tsx`

**Changes:**
1. Fix `translate-x-full` direction
2. Update responsive widths
3. Verify theme compatibility

### Task 3: Add Message Animations

**File:** `frontend/src/components/chat/ChatMessages.tsx`

**Changes:**
1. Add slide-up animation for new messages
2. Stagger animation for multiple messages
3. Respect `prefers-reduced-motion`

### Task 4: Enhance ChatInput

**File:** `frontend/src/components/chat/ChatInput.tsx`

**Changes:**
1. Add send button hover/active states
2. Improve focus states
3. Theme-aware placeholder color

### Task 5: Theme Integration Testing

**Test all 7 themes:**
- Default (light/dark)
- Catppuccin Latte (light)
- Catppuccin Frappe (dark)
- Catppuccin Macchiato (dark)
- Catppuccin Mocha (dark)
- Dracula (dark)
- Dracula Light (light)

**Verify:**
- Text contrast ≥ 4.5:1
- Interactive elements ≥ 3:1
- Colors harmonize with theme palette
- No jarring transitions when switching themes

---

## Accessibility Checklist

- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus visible indicators (2px solid primary-500, 2px offset)
- [ ] ARIA labels on icon-only buttons
- [ ] ARIA live region for new messages
- [ ] Screen reader announcements for actions
- [ ] Touch targets ≥ 44x44px (mobile)
- [ ] Color contrast WCAG AA
- [ ] Respects prefers-reduced-motion
- [ ] Focus trap in panel when open

---

## i18n Keys Required

**ActionCard Labels:**
```json
{
  "chat.action.create_goal": "Create Financial Goal",
  "chat.action.create_budget": "Generate Budget",
  "chat.action.parameters": "Parameters",
  "chat.action.monthlyIncome": "Monthly Income",
  "chat.action.targetAmount": "Target Amount",
  "chat.action.years": "Years",
  "chat.action.goalType": "Goal Type",
  "chat.action.feedback": "Feedback",
  "chat.action.language": "Language"
}
```

---

## Success Criteria

- [ ] ActionCard displays structured parameter preview
- [ ] All components use theme-aware colors
- [ ] Animations smooth and performant (<16ms frame time)
- [ ] Responsive on all breakpoints (320px, 768px, 1024px+)
- [ ] Accessibility verified with keyboard and screen reader
- [ ] i18n working for en/ja/vi

---

## Next Steps

Phase 3: Implementation, testing, and documentation
