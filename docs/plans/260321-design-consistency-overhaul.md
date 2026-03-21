# Design Consistency Overhaul Plan

**Date:** 2026-03-21
**Status:** Complete
**Goal:** Unify page personality, fix loading states, simplify navigation, calm Settings, add card hierarchy

---

## Tasks

### 1. PageShell + Unified Page Personality
- [x] Create `PageShell.tsx` component (~80 lines) with: sticky header slot, consistent `max-w-2xl` default, `pb-[calc(6rem+env(safe-area-inset-bottom))]`, `animate-fade-in`
- [x] Create `PageSkeleton.tsx` with 3 variants: `list`, `cards`, `chart`
- [x] Wrap Dashboard, Budget, Goals, Analytics, Transactions, Settings in PageShell
- [x] Remove duplicate sticky header code from each page
- [x] Standardize header style: utilitarian-clean for all inner pages, editorial warmth for Dashboard only
- [x] Fix magic number font sizes: `text-[1.875rem]` → `text-3xl`, `text-[2.75rem]` → `text-5xl`
- [x] Fix sticky header opacity: `bg-white/80` → `bg-white/95` for better readability

### 2. Loading States (Skeletons)
- [x] Build `PageSkeleton` variant: `list` (header bar + 5 row skeletons)
- [x] Build `PageSkeleton` variant: `cards` (header bar + 2x2 card grid)
- [x] Build `PageSkeleton` variant: `chart` (header bar + large rect + small rects)
- [x] Replace bare `<LoadingSpinner>` in Budget with `<PageSkeleton variant="cards" />`
- [x] Replace bare `<LoadingSpinner>` in Goals with `<PageSkeleton variant="cards" />`
- [x] Replace bare `<LoadingSpinner>` in Analytics with `<PageSkeleton variant="chart" />`
- [x] Replace bare `<LoadingSpinner>` in Settings with `<PageSkeleton variant="list" />`
- [x] Replace lazy-load pulse div in Dashboard with proper skeleton

### 3. Navigation Simplification
- [x] Mobile: remove Header mobile menu (hamburger + menu items). Header keeps: logo, privacy toggle, language only
- [x] Desktop: Sidebar is single nav. Header keeps: privacy toggle, theme, language, logout
- [x] Verify zero duplication between BottomNav and Header

### 4. Settings Color Calm-Down
- [x] Replace 11 unique section tab colors with single color: active = `primary-600` white text, inactive = `gray-100` gray text
- [x] Remove `SECTION_COLORS` map entirely

### 5. Card Temperature System
- [x] Add `temperature` prop to Card: `warm` (default, current style) and `cool` (no shadow, lighter border `border-gray-100`, tighter `p-3`)
- [x] Apply `cool` to: supporting widgets, detail panels, settings sections
- [x] Keep `warm` for: NetWorthHero, main budget card, primary goal card

### 6. Verify & Cleanup
- [x] Verify `animate-stagger-in` fully removed from Goals
- [x] Build check passes
- [x] No new TS errors

---

## Progress Log

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | PageShell + Personality | done | PageShell.tsx (65 lines), wrapped 6 pages, fixed magic font sizes, header opacity |
| 2 | Loading Skeletons | done | PageSkeleton.tsx (55 lines) with list/cards/chart variants, replaced all bare spinners |
| 3 | Navigation Simplify | done | Header.tsx 181→93 lines, removed mobile menu, added mobile privacy toggle |
| 4 | Settings Calm-Down | done | Removed SECTION_COLORS (11 colors), unified to primary-600 active/gray inactive |
| 5 | Card Temperature | done | warm/cool prop on Card, applied cool to 4 supporting dashboard widgets |
| 6 | Verify & Cleanup | done | Removed stagger-in from 15 files + CSS, upgraded text-[10px] in 15 files, font-extrabold only in NetWorthHero |
