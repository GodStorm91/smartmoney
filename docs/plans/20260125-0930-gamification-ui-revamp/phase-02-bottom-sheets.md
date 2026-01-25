# Phase 02: Bottom Sheets

**Date:** 2026-01-25 | **Priority:** High | **Status:** Pending | **Est:** 3h

---

## Context

- [Main Plan](./plan.md)
- [Bottom Sheet Research](./research/researcher-01-bottom-sheet.md)

## Overview

Implement profile and badge detail bottom sheets using vaul/drawer library.

## Dependencies

```bash
npm install vaul
```

## Related Files

```
frontend/src/components/gamification/
  ProfilePage.tsx          # Extract avatar logic
  BadgeGrid.tsx            # Reuse BadgeCard styling
```

## Requirements

### ProfileBottomSheet
- Trigger: Tap avatar in hero card
- Height: ~70% viewport
- Contents: Large avatar, avatar selector grid, name editor, stats

### BadgeDetailSheet
- Trigger: Tap any badge
- Height: ~50% viewport
- Contents: Badge icon, name, description, rarity, XP, progress/unlock date

## Implementation Steps

### Step 1: Install vaul

```bash
cd frontend && npm install vaul
```

### Step 2: Create ProfileBottomSheet.tsx (~90 lines)

```typescript
// frontend/src/components/gamification/ProfileBottomSheet.tsx
import { Drawer } from 'vaul';

interface ProfileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileBottomSheet({ open, onOpenChange }: ProfileBottomSheetProps): JSX.Element {
  // Use existing avatar query from rewards-service
  // Avatar selector: 4-column grid
  // Name input: controlled input with save button
  // Stats: Level, Total XP display
}
```

**Structure:**
```
+------------------------------------------+
|              [drag handle]               |
|                                          |
|         [Large Avatar 96px]              |
|         "Display Name"                   |
|                                          |
|  -- Select Avatar -------------------    |
|  [av1] [av2] [av3] [av4]                |
|  [av5] [av6] [av7] [av8]                |
|                                          |
|  -- Stats ---------------------------    |
|  Level 12        Total XP: 2,450        |
+------------------------------------------+
```

### Step 3: Create BadgeDetailSheet.tsx (~80 lines)

```typescript
// frontend/src/components/gamification/BadgeDetailSheet.tsx
import { Drawer } from 'vaul';

interface BadgeDetailSheetProps {
  badge: Achievement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BadgeDetailSheet({ badge, open, onOpenChange }: BadgeDetailSheetProps): JSX.Element {
  // Rarity-colored header accent
  // Large badge icon with glow
  // Name, description, category tag
  // XP reward display
  // Progress bar (if locked) or unlock date (if unlocked)
}
```

**Structure:**
```
+------------------------------------------+
|   [rarity-colored accent bar]            |
|              [drag handle]               |
|                                          |
|         [Badge Icon 80px]                |
|         "Badge Name"                     |
|         [Epic] rarity label              |
|                                          |
|  "Complete 50 transactions..."           |
|                                          |
|  [category icon] transactions   +100 XP  |
|                                          |
|  [========----] 78% progress             |
|  OR                                      |
|  Unlocked: Jan 15, 2026                  |
+------------------------------------------+
```

### Step 4: Integrate in GamificationDashboard

Add to GamificationDashboard.tsx:

```typescript
import { ProfileBottomSheet } from './ProfileBottomSheet';
import { BadgeDetailSheet } from './BadgeDetailSheet';

// In component:
return (
  <div className="space-y-6">
    {/* ... existing sections ... */}

    <ProfileBottomSheet
      open={showProfileSheet}
      onOpenChange={setShowProfileSheet}
    />

    <BadgeDetailSheet
      badge={selectedBadge}
      open={!!selectedBadge}
      onOpenChange={(open) => !open && setSelectedBadge(null)}
    />
  </div>
);
```

## Vaul Usage Pattern

```typescript
import { Drawer } from 'vaul';

<Drawer.Root open={open} onOpenChange={onOpenChange}>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40" />
    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl">
      <div className="mx-auto w-12 h-1.5 bg-gray-300 rounded-full my-4" />
      {/* Content */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

## Todo

- [ ] Install vaul package
- [ ] Create `ProfileBottomSheet.tsx`
- [ ] Create `BadgeDetailSheet.tsx`
- [ ] Integrate sheets in GamificationDashboard
- [ ] Test drag-to-close gesture
- [ ] Test keyboard accessibility (Escape to close)

## Success Criteria

- [ ] Profile sheet opens on avatar tap
- [ ] Badge sheet opens on badge tap
- [ ] Sheets close on drag-down or overlay tap
- [ ] Avatar selection works
- [ ] Rarity colors applied correctly
- [ ] Mobile touch gestures work
