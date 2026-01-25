# Avatar Picker Brainstorm Summary

**Date:** 2026-01-25
**Issue:** Avatar click doesn't display popup on desktop - only shows overlay

---

## Problem Statement

Clicking the avatar in the gamification HeroProgressCard opens `ProfileBottomSheet`, which uses `BottomSheet` component with `lg:hidden` class. **Result:** Works on mobile, completely invisible on desktop (1024px+).

**User Request:** Fix the issue + add picture upload/edit feature + make it fun/easy to use.

---

## Root Cause Analysis

```typescript
// BottomSheet.tsx line 48
<div className="fixed inset-0 z-50 lg:hidden">  // ← Desktop users see nothing!
```

The `BottomSheet` component was designed mobile-only. When user clicks avatar on desktop:
1. Backdrop appears (black overlay)
2. Actual sheet is hidden via `lg:hidden`
3. User sees just overlay with no content

---

## Solution Options

### Option 1: Quick Fix - Swap to ResponsiveModal (Recommended for immediate fix)

**Effort:** ~5 minutes
**Changes:** 1 file, 2 lines

The codebase already has `ResponsiveModal` component that handles both mobile (bottom sheet) and desktop (centered modal).

```diff
// ProfileBottomSheet.tsx
- import { BottomSheet } from '@/components/ui/BottomSheet'
+ import { ResponsiveModal } from '@/components/ui/ResponsiveModal'

- <BottomSheet isOpen={isOpen} onClose={onClose} title={...}>
+ <ResponsiveModal isOpen={isOpen} onClose={onClose} title={...} size="lg">
```

**Pros:**
- Immediate fix, zero new dependencies
- Uses existing battle-tested code
- Keeps all current functionality (avatar grid, upload)

**Cons:**
- Doesn't add new image editing features
- Same basic UI, just works on desktop now

---

### Option 2: Enhanced Avatar Picker (Recommended for full feature)

**Effort:** 2-3 days
**New Dependencies:** `react-easy-crop` (17KB gzipped)

Create new `AvatarPickerModal` component with:
- Two tabs: "Emoji Avatars" | "Upload Custom"
- Rarity filter (All/Common/Rare/Epic/Legendary)
- Collection progress bar
- Image cropper for custom uploads
- Fun animations (bounce on select, shimmer on legendary)

**Component Structure:**
```
AvatarPickerModal/
├── index.ts
├── AvatarPickerModal.tsx      # Main container
├── EmojiAvatarGrid.tsx        # Avatar selection grid
├── AvatarCell.tsx             # Individual avatar button
├── CustomUploadPanel.tsx      # Upload tab content
├── ImageCropper.tsx           # Crop/zoom interface
├── RarityFilterBar.tsx        # Filter pills
└── CollectionProgress.tsx     # X/Y unlocked indicator
```

**Pros:**
- Full image crop/zoom for custom avatars
- Much better UX with rarity filtering
- Fun animations make it engaging
- Modular components for reuse

**Cons:**
- More development time
- New dependency
- More code to maintain

---

### Option 3: Avatar Builder (Future Enhancement)

**Effort:** 1-2 weeks
**Description:** Allow users to build custom avatars from parts (face, hair, accessories)

Similar to:
- Notion's avatar builder
- Duolingo's character customization
- Discord's custom emoji creator

**Not recommended now** - Over-engineered for current needs. Consider for v2.

---

## Library Comparison for Image Cropping

| Library | Size | Touch | Circular Preview | React 18 |
|---------|------|-------|------------------|----------|
| react-easy-crop | 17KB | Yes | Yes | Yes |
| react-avatar-editor | 42KB | Yes | Yes | Yes |
| react-cropper | 25KB + 26KB | Yes | Manual CSS | Yes |
| react-image-crop | 9KB | Partial | No | Yes |

**Recommendation:** `react-easy-crop` - smallest with all needed features, excellent mobile touch support.

---

## UI/UX Design Specifications

### Desktop Layout (≥1024px)
- Centered modal, max-width 576px
- Two-tab interface at top
- 6-column avatar grid
- Avatar cells: 72px with hover effects
- Cancel/Confirm buttons in footer

### Mobile Layout (<1024px)
- Slide-up bottom sheet
- Drag handle for dismiss gesture
- 4-column compact grid
- Avatar cells: 64px
- Full-width action button

### Interaction Patterns

| Interaction | Effect |
|-------------|--------|
| Hover avatar | Scale 1.08x, shadow |
| Click available | Bounce + green checkmark |
| Click locked | Shake + "Unlock at Lv.X" tooltip |
| Legendary hover | Gold shimmer effect |
| Selection confirm | Confetti burst |
| ESC key | Close modal |

### Accessibility
- Full keyboard navigation (arrows, tab, enter, escape)
- ARIA labels with name + rarity + lock status
- Focus trap in modal
- Reduced motion support
- Color + icon indicators (not color alone)

---

## Recommended Approach

### Phase 1: Quick Fix (Do Now)
1. Change `ProfileBottomSheet` to use `ResponsiveModal`
2. Test on both mobile and desktop
3. Deploy

### Phase 2: Enhanced Picker (Next Sprint)
1. Install `react-easy-crop`
2. Create `AvatarPickerModal` component structure
3. Add image crop functionality to custom upload
4. Add rarity filter and collection progress
5. Polish with animations

### Phase 3: Future (Backlog)
- Avatar builder with customizable parts
- Animated avatar frames (legendary perk)
- Avatar achievements/badges display

---

## Technical Notes

### Existing Backend Support
- `useUploadCustomAvatar` mutation exists
- HEIC conversion already implemented
- 5MB file size limit already enforced
- Avatar activate endpoint working

### Cropper Integration Points
```typescript
// In CustomUploadPanel.tsx
const onCropComplete = (croppedArea, croppedAreaPixels) => {
  // Generate cropped image blob
  const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
  uploadCustomAvatar(croppedImage)
}
```

---

## Summary

| Approach | Effort | Recommended |
|----------|--------|-------------|
| Quick Fix (ResponsiveModal swap) | 5 min | Yes - Do immediately |
| Enhanced Picker | 2-3 days | Yes - Next sprint |
| Avatar Builder | 1-2 weeks | No - Overkill for now |

**Bottom Line:** Start with the 1-line fix to unblock desktop users immediately, then plan enhanced picker for better UX. Avoid over-engineering.

---

## Sources

- [react-avatar-editor - npm](https://www.npmjs.com/package/react-avatar-editor)
- [react-easy-crop - GitHub](https://github.com/ValentinH/react-easy-crop)
- [Top React image cropping libraries - LogRocket](https://blog.logrocket.com/top-react-image-cropping-libraries/)
- [Manage User Avatars in React - Tolgee](https://tolgee.io/blog/manage-user-avatar)
