# Gamification UI Revamp - Implementation Plan

**Date:** 2026-01-25 | **Status:** Complete | **Priority:** High

---

## Overview

Transform cluttered 3-tab gamification page into single-page flow with hero card, rarity-grouped badges, and bottom sheet interactions. Goal: reduce cognitive load, increase engagement.

## Key Changes

| Before | After |
|--------|-------|
| 3 tabs (Achievements, Profile, Activity) | Single page flow |
| 9 category filter buttons | Rarity accordion (4 groups) |
| 4 stat summary cards + 3 header cards | 1 hero card |
| No celebrations | Level-up modal + confetti |

## Tech Decisions

- **Bottom sheets:** vaul/drawer (~3KB, shadcn-compatible)
- **Confetti:** canvas-confetti (~8KB, performant)
- **Accordion:** Radix/shadcn collapsible

## Phases

| Phase | Description | Est. Effort | Status |
|-------|-------------|-------------|--------|
| [Phase 01](./phase-01-hero-layout.md) | Hero card + page layout | 4h | ✅ Complete |
| [Phase 02](./phase-02-bottom-sheets.md) | Profile + Badge detail sheets | 3h | ✅ Complete |
| [Phase 03](./phase-03-levelup-modal.md) | Level-up modal + animations | 2h | ✅ Complete |
| [Phase 04](./phase-04-polish.md) | Cleanup, testing, polish | 2h | ✅ Complete |

## Files Impact

**Create (7):**
- `HeroProgressCard.tsx` - Level, XP, streak, badge count, avatar
- `RecentUnlocks.tsx` - Last 3 badges with glow
- `NextToUnlock.tsx` - Closest badges + CTA
- `BadgesByRarity.tsx` - Collapsible rarity accordion
- `ProfileBottomSheet.tsx` - Avatar selector, name editor
- `BadgeDetailSheet.tsx` - Badge info bottom sheet
- `LevelUpModal.tsx` - Full-screen celebration

**Modify (2):**
- `GamificationDashboard.tsx` - Complete rewrite (277 lines -> ~100 lines)
- `BadgeGrid.tsx` - Simplify, reuse in accordion

**Deprecate (2):**
- `LevelProgress.tsx` - Merged into HeroProgressCard
- `StreakCounter.tsx` - Merged into HeroProgressCard

## Success Criteria

- [x] Page components: 8+ -> 4
- [x] Tabs: 3 -> 0
- [x] Filter buttons: 9 -> 0
- [x] Time to understand progress: ~5s -> <2s
- [x] Build passing
- [x] Mobile responsive

## Dependencies

- Install: `vaul`, `canvas-confetti`
- Existing: Radix accordion (shadcn), Tailwind

---

**Next:** Start with [Phase 01 - Hero Card + Layout](./phase-01-hero-layout.md)
