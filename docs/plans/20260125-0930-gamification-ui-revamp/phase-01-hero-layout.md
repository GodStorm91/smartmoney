# Phase 01: Hero Card + Page Layout

**Date:** 2026-01-25 | **Priority:** Critical | **Status:** Pending | **Est:** 4h

---

## Context

- [Main Plan](./plan.md)
- [Brainstorm](../gamification-ui-revamp-plan.md)
- [Scout Report](./scout/scout-01-gamification-files.md)

## Overview

Create hero progress card consolidating level, XP, streak, badge count. Restructure GamificationDashboard from 3-tab layout to single-page flow.

## Related Files

```
frontend/src/components/gamification/
  GamificationDashboard.tsx  # Rewrite
  LevelProgress.tsx          # Deprecate (extract logic)
  StreakCounter.tsx          # Deprecate (extract logic)
  AvatarBadge.tsx            # Reuse
```

## Requirements

1. **HeroProgressCard** must display:
   - Tappable avatar (opens profile sheet - Phase 02)
   - Level number (large, prominent)
   - XP progress bar with current/next values
   - Streak counter with fire icon
   - Badge count (X/Y format)

2. **Page layout** sections:
   - Hero card (top)
   - Recent Unlocks (horizontal scroll)
   - Next To Unlock (1-2 badges + CTA)
   - All Badges (rarity accordion)

## Implementation Steps

### Step 1: Create HeroProgressCard.tsx (~80 lines)

```typescript
// frontend/src/components/gamification/HeroProgressCard.tsx

interface HeroProgressCardProps {
  level: number;
  totalXP: number;
  xpToNextLevel: number;
  progressPercent: number;
  currentStreak: number;
  badgesUnlocked: number;
  badgesTotal: number;
  avatarUrl?: string;
  onAvatarClick: () => void;
}

export function HeroProgressCard(props: HeroProgressCardProps): JSX.Element {
  // Gradient bg: from-blue-600 to-purple-600
  // Avatar: 64px circle, tap handler
  // Level: text-3xl font-bold
  // XP bar: h-3, animated fill
  // Streak: flex items-center gap-1, Flame icon
  // Badge count: Trophy icon + "12/48"
}
```

**Visual structure:**
```
+-----------------------------------------------+
|  [Avatar]   Level 12                          |
|     tap->   ================---- 2,450/3,000  |
|                                               |
|  [fire] 15 day streak      [trophy] 12/48    |
+-----------------------------------------------+
```

### Step 2: Create RecentUnlocks.tsx (~60 lines)

```typescript
// frontend/src/components/gamification/RecentUnlocks.tsx

interface RecentUnlocksProps {
  badges: Achievement[];  // Last 3 unlocked
  onBadgeClick: (badge: Achievement) => void;
}

export function RecentUnlocks({ badges, onBadgeClick }: RecentUnlocksProps): JSX.Element {
  // Horizontal scroll container
  // Each badge: icon + name + rarity glow
  // Empty state: "Complete actions to earn badges!"
}
```

### Step 3: Create NextToUnlock.tsx (~70 lines)

```typescript
// frontend/src/components/gamification/NextToUnlock.tsx

interface NextToUnlockProps {
  badges: Achievement[];  // 1-2 closest to completion
  onAddTransaction: () => void;
  onBadgeClick: (badge: Achievement) => void;
}

export function NextToUnlock({ badges, onAddTransaction, onBadgeClick }: NextToUnlockProps): JSX.Element {
  // Card with badge icon, name, progress bar
  // Actionable hint: "Log 2 more transactions"
  // CTA button: "Add Transaction"
  // Progress bar pulses when >75%
}
```

**Badge selection logic:**
```typescript
const nextBadges = achievements
  .filter(a => !a.unlocked && a.progress > 0 && a.progress < 100)
  .sort((a, b) => b.progress - a.progress)
  .slice(0, 2);
```

### Step 4: Create BadgesByRarity.tsx (~90 lines)

```typescript
// frontend/src/components/gamification/BadgesByRarity.tsx

interface BadgesByRarityProps {
  achievements: Achievement[];
  onBadgeClick: (badge: Achievement) => void;
}

export function BadgesByRarity({ achievements, onBadgeClick }: BadgesByRarityProps): JSX.Element {
  // Use Radix/shadcn Accordion
  // Groups: legendary, epic, rare, common
  // Each header: rarity name + count (e.g., "Epic (2/8)")
  // Expanded: badge grid (unlocked first, then locked)
}
```

### Step 5: Rewrite GamificationDashboard.tsx (~100 lines)

Remove:
- 3-tab navigation
- CATEGORIES array (9 items)
- categoryFilter state
- Activity tab content
- 4 stat summary cards

Add:
- `selectedBadge` state for bottom sheet
- `showProfileSheet` state
- Single-page layout with sections

```typescript
export function GamificationDashboard(): JSX.Element {
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null);

  // Existing queries: stats, achievementsData

  const recentUnlocks = achievementsData.achievements
    .filter(a => a.unlocked)
    .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
    .slice(0, 3);

  const nextToUnlock = achievementsData.achievements
    .filter(a => !a.unlocked && a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <HeroProgressCard
        level={stats.current_level}
        totalXP={stats.total_xp}
        xpToNextLevel={stats.xp_to_next_level}
        progressPercent={progressPercentage}
        currentStreak={stats.current_streak}
        badgesUnlocked={unlockedCount}
        badgesTotal={totalCount}
        onAvatarClick={() => setShowProfileSheet(true)}
      />

      <RecentUnlocks
        badges={recentUnlocks}
        onBadgeClick={setSelectedBadge}
      />

      <NextToUnlock
        badges={nextToUnlock}
        onAddTransaction={() => navigate('/transactions/new')}
        onBadgeClick={setSelectedBadge}
      />

      <BadgesByRarity
        achievements={achievementsData.achievements}
        onBadgeClick={setSelectedBadge}
      />

      {/* Bottom sheets - Phase 02 */}
    </div>
  );
}
```

## Todo

- [ ] Create `HeroProgressCard.tsx`
- [ ] Create `RecentUnlocks.tsx`
- [ ] Create `NextToUnlock.tsx`
- [ ] Create `BadgesByRarity.tsx`
- [ ] Rewrite `GamificationDashboard.tsx`
- [ ] Test mobile responsiveness
- [ ] Verify existing queries work

## Success Criteria

- [ ] Single-page layout renders correctly
- [ ] Hero card shows all stats
- [ ] Recent unlocks displays last 3 badges
- [ ] Next to unlock shows 1-2 badges with progress
- [ ] Rarity accordion expands/collapses
- [ ] No TypeScript errors
- [ ] File sizes <= 100 lines each
