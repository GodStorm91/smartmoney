# Avatar Picker Fix Plan

**Date:** 2026-01-25 10:45
**Status:** In Progress

## Problem
Avatar click in gamification page shows only overlay on desktop - BottomSheet has `lg:hidden`.

## Solution
Two-phase implementation:

### Phase 1: Quick Fix (5 min) ✅
- [phase-01-quick-fix.md](./phase-01-quick-fix.md)
- Swap BottomSheet → ResponsiveModal in ProfileBottomSheet

### Phase 2: Enhanced Picker (2-3 hrs)
- [phase-02-enhanced-picker.md](./phase-02-enhanced-picker.md)
- Add image cropping with react-easy-crop
- Add rarity filter
- Improve UX with animations

## Files to Modify
- `frontend/src/components/gamification/ProfileBottomSheet.tsx`
- `frontend/package.json` (add react-easy-crop)

## Success Criteria
- [ ] Avatar picker works on desktop
- [ ] Avatar picker works on mobile
- [ ] Custom image upload with crop/zoom
- [ ] Rarity filter functional
- [ ] Type check passes
