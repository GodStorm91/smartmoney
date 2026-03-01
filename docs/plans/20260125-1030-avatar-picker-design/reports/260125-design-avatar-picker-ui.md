# Avatar Picker UI Design Report

**Date**: 2026-01-25
**Author**: UI/UX Designer Agent

---

## Executive Summary

Designed a modern, accessible avatar picker that fixes the desktop visibility issue and enhances user engagement through gamified elements.

**Problem**: Current `ProfileBottomSheet` uses `BottomSheet` component with `lg:hidden`, invisible on desktop.

**Solution**: New `AvatarPickerModal` using existing `ResponsiveModal` pattern - bottom sheet on mobile, centered modal on desktop.

---

## Key Design Decisions

### 1. Responsive Strategy
- Use existing `ResponsiveModal` (already handles mobile/desktop)
- Mobile (<1024px): slide-up bottom sheet
- Desktop (>=1024px): centered modal, max-width 576px

### 2. Component Structure
```
AvatarPickerModal
├── TabNavigation (Emoji | Upload)
├── EmojiAvatarGrid
│   ├── RarityFilterBar
│   ├── AvatarCell[] (grid)
│   └── CollectionProgress
├── CustomUploadPanel
│   ├── DropZone
│   └── ImageCropper (react-easy-crop)
└── Footer (Cancel | Confirm)
```

### 3. Visual Hierarchy
- **Rarity colors**: Common=gray, Rare=blue, Epic=purple, Legendary=gold gradient
- **States**: Locked (overlay + level badge), Selected (green ring), Focused (blue ring)
- **Grid**: 4 cols mobile, 5 cols tablet, 6 cols desktop

### 4. Accessibility
- Full keyboard navigation (Arrow keys, Tab, Enter, Escape)
- ARIA roles: listbox, option, tablist, tabpanel
- Focus trap within modal
- Screen reader labels with rarity and unlock info
- Respects `prefers-reduced-motion`

### 5. Fun Factor
- Legendary avatars: shimmer animation
- Selection: bounce + checkmark animation
- Upload success: confetti burst
- Collection progress bar with next unlock preview

---

## Implementation Priority

1. **Immediate Fix**: Replace `BottomSheet` with `ResponsiveModal` in `ProfileBottomSheet.tsx`
2. **Phase 2**: Add tabbed interface and rarity filters
3. **Phase 3**: Implement image cropper for custom uploads

---

## Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `react-easy-crop` | Image crop/zoom | New install |
| `focus-trap-react` | Modal focus management | Optional |
| `framer-motion` | Animations | Already installed |

---

## Files to Create

```
frontend/src/components/gamification/avatar-picker/
├── index.ts
├── AvatarPickerModal.tsx
├── EmojiAvatarGrid.tsx
├── AvatarCell.tsx
├── CustomUploadPanel.tsx
├── ImageCropper.tsx
├── RarityFilterBar.tsx
└── CollectionProgress.tsx
```

---

## Quick Fix (Minimal Change)

If immediate fix needed, simply change `ProfileBottomSheet.tsx`:

```diff
- import { BottomSheet } from '@/components/ui/BottomSheet'
+ import { ResponsiveModal } from '@/components/ui/ResponsiveModal'

- <BottomSheet isOpen={isOpen} onClose={onClose} title={...}>
+ <ResponsiveModal isOpen={isOpen} onClose={onClose} title={...} size="lg">
```

This single change fixes desktop visibility while full redesign is implemented.

---

## Related Documents

- [Phase 01: UI/UX Design](../phase-01-ui-ux-design.md)
- [Phase 02: Component Architecture](../phase-02-component-architecture.md)
- [Phase 03: Implementation Guide](../phase-03-implementation-guide.md)

---

## Unresolved Questions

1. Should legendary avatars have sound effects? (User preference toggle exists)
2. Max custom avatars per user? (Backend constraint needed)
3. Should we show "preview" of next unlockable avatar prominently?
