# Scout Report: Gamification Component Files

**Date:** 2026-01-25
**Purpose:** Identify all gamification-related files for UI revamp

---

## Frontend Components (`/frontend/src/components/gamification/`)

| File | Purpose | Status |
|------|---------|--------|
| `GamificationDashboard.tsx` | Main page with 3 tabs (Achievements, Profile, Activity) | **REWRITE** |
| `ProfilePage.tsx` | Avatar selector, display name | Move to bottom sheet |
| `BadgeGrid.tsx` | Badge display grid with rarity styling | Refactor for rarity grouping |
| `LevelProgress.tsx` | Level + XP progress card | Merge into Hero card |
| `StreakCounter.tsx` | Streak display card | Merge into Hero card |
| `XPToast.tsx` | XP gain notifications | Keep as-is |
| `AvatarBadge.tsx` | Avatar display component | Keep, use in Hero |
| `LevelBadge.tsx` | Level badge component | Keep |
| `GamificationSettings.tsx` | Gamification settings | Keep |

---

## Services

| File | Purpose |
|------|---------|
| `frontend/src/services/gamification-service.ts` | API calls: getStats, getAchievements, trackLogin |
| `frontend/src/services/rewards-service.ts` | Profile, avatars, achievements queries |

---

## New Files To Create

| File | Purpose |
|------|---------|
| `HeroProgressCard.tsx` | Combined Level + Streak + Avatar + Badge count |
| `RecentUnlocks.tsx` | Last 3 unlocked badges |
| `NextToUnlock.tsx` | 1-2 badges closest to unlock + CTA |
| `BadgesByRarity.tsx` | Collapsible rarity accordion |
| `ProfileBottomSheet.tsx` | Profile customization sheet |
| `BadgeDetailSheet.tsx` | Badge detail bottom sheet |
| `LevelUpModal.tsx` | Full-screen level up celebration |

---

## Files To Remove/Deprecate

- `LevelProgress.tsx` - Functionality moves to HeroProgressCard
- `StreakCounter.tsx` - Functionality moves to HeroProgressCard

---

## Related UI Components

| File | Relevant For |
|------|--------------|
| `frontend/src/components/ui/Card.tsx` | Card containers |
| `frontend/src/components/ui/Button.tsx` | CTA buttons |
| `frontend/src/components/ui/Badge.tsx` | Status badges |

---

## Backend Endpoints (No Changes Needed)

- `GET /api/gamification/stats` - Level, XP, streak data
- `GET /api/gamification/achievements` - All achievements with progress
- `POST /api/gamification/track-login` - Daily check-in
- `GET /api/profile` - User profile with avatar
- `GET /api/avatars` - Available avatars
- `POST /api/avatars/activate/{id}` - Activate avatar
