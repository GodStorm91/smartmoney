# Phase 04: Polish, Cleanup, Testing

**Date:** 2026-01-25 | **Priority:** Medium | **Status:** Pending | **Est:** 2h

---

## Context

- [Main Plan](./plan.md)
- [Code Standards](../../../docs/code-standards.md)

## Overview

Final polish: remove deprecated files, add tests, ensure i18n, mobile QA.

## Cleanup Tasks

### 1. Deprecate Old Components

Mark as deprecated (add comment, don't delete yet):

```typescript
// frontend/src/components/gamification/LevelProgress.tsx
/**
 * @deprecated Use HeroProgressCard instead. Will be removed in v2.0.
 */
export function LevelProgress() { ... }
```

```typescript
// frontend/src/components/gamification/StreakCounter.tsx
/**
 * @deprecated Use HeroProgressCard instead. Will be removed in v2.0.
 */
export function StreakCounter() { ... }
```

### 2. Update Imports

Ensure no other files import deprecated components:

```bash
grep -r "LevelProgress\|StreakCounter" frontend/src --include="*.tsx" --include="*.ts"
```

### 3. Remove Dead Code from GamificationDashboard

- Remove CATEGORIES array
- Remove categoryFilter state
- Remove Activity tab logic
- Remove 4 stat summary cards

## Testing

### Unit Tests (Vitest)

Create test file:

```typescript
// frontend/src/components/gamification/__tests__/gamification-dashboard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { GamificationDashboard } from '../GamificationDashboard';
import { QueryClientProvider } from '@tanstack/react-query';

describe('GamificationDashboard', () => {
  it('renders hero card with stats', async () => {
    render(<GamificationDashboard />);
    expect(await screen.findByText(/Level/)).toBeInTheDocument();
    expect(screen.getByText(/streak/i)).toBeInTheDocument();
  });

  it('opens profile sheet on avatar click', async () => {
    render(<GamificationDashboard />);
    const avatar = await screen.findByRole('button', { name: /avatar/i });
    fireEvent.click(avatar);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens badge detail on badge click', async () => {
    render(<GamificationDashboard />);
    const badge = await screen.findByText(/First Steps/);
    fireEvent.click(badge);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

- [ ] Desktop Chrome: All sections render
- [ ] Mobile Safari: Touch gestures work
- [ ] Mobile Chrome: Bottom sheets swipe
- [ ] Dark mode: Colors correct
- [ ] Empty state: No badges yet message
- [ ] Screen reader: ARIA labels present

## i18n Updates

Add missing translation keys to `locales/en/common.json`:

```json
{
  "gamification": {
    "hero": {
      "level": "Level",
      "streak": "day streak",
      "badges": "badges"
    },
    "recentUnlocks": {
      "title": "Recent Unlocks",
      "empty": "Complete actions to earn badges!"
    },
    "nextToUnlock": {
      "title": "Next To Unlock",
      "hint": "Log {{count}} more transactions",
      "addTransaction": "Add Transaction"
    },
    "allBadges": {
      "title": "All Badges",
      "legendary": "Legendary",
      "epic": "Epic",
      "rare": "Rare",
      "common": "Common"
    },
    "levelUp": {
      "title": "Level {{level}}!",
      "message": "Keep up the great work!",
      "continue": "Continue"
    }
  }
}
```

## Accessibility

- [ ] Bottom sheets have `role="dialog"` and `aria-modal="true"`
- [ ] Avatar button has `aria-label="Open profile"`
- [ ] Badge cards are keyboard focusable
- [ ] Escape key closes modals/sheets
- [ ] Focus traps in sheets
- [ ] Reduced motion: disable confetti

## Performance Check

- [ ] Lighthouse score >90
- [ ] No layout shift on load
- [ ] Bottom sheet animations 60fps
- [ ] Bundle size increase <15KB

## Todo

- [ ] Deprecate LevelProgress.tsx
- [ ] Deprecate StreakCounter.tsx
- [ ] Clean GamificationDashboard.tsx
- [ ] Add unit tests
- [ ] Update i18n keys
- [ ] Manual mobile testing
- [ ] Accessibility audit
- [ ] Performance audit

## Success Criteria

- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] i18n complete
- [ ] A11y compliant
- [ ] Performance acceptable
