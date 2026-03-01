# Phase 01: UI/UX Design - Avatar Picker

**Date**: 2026-01-25
**Status**: Complete

---

## 1. Design Philosophy

**Core Principles:**
- **Playful yet Professional**: Aligns with gamification theme while maintaining SmartMoney's trustworthy aesthetic
- **Progressive Disclosure**: Simple default, power features discoverable
- **Immediate Feedback**: Every interaction acknowledged visually
- **Inclusive Design**: Works for all users, abilities, and contexts

---

## 2. Visual Design

### 2.1 Desktop Modal (1024px+)

```
+----------------------------------------------------------+
|  [x]                    Choose Avatar                     |
+----------------------------------------------------------+
|                                                           |
|  +-------------+  +-------------+                         |
|  | Emoji       |  | Upload      |   <- Tab Navigation    |
|  | Avatars [*] |  | Custom      |                         |
|  +-------------+  +-------------+                         |
|                                                           |
|  +-------------------------------------------------+      |
|  |                                                  |     |
|  |  Filter: [All v] [Common] [Rare] [Epic] [Legend] |     |
|  |                                                  |     |
|  |  +------+ +------+ +------+ +------+ +------+   |     |
|  |  | :)   | | :D   | | B)   | | <3   | | :P   |   |     |
|  |  |Common| |Common| | Rare | | Epic | |Lgnd  |   |     |
|  |  +------+ +------+ +------+ +------+ +------+   |     |
|  |                                                  |     |
|  |  +------+ +------+ +------+ +------+ +------+   |     |
|  |  | [?]  | | [?]  | | [?]  |  ...               |     |
|  |  | Lv.5 | | Lv.10| | Lv.15|  <- Locked avatars |     |
|  |  +------+ +------+ +------+                     |     |
|  |                                                  |     |
|  +-------------------------------------------------+      |
|                                                           |
|  [Cancel]                              [Select Avatar]    |
+----------------------------------------------------------+
```

**Specifications:**
- Modal width: `max-w-xl` (576px)
- Modal height: `max-h-[90vh]` with scroll
- Border radius: `rounded-xl` (12px)
- Shadow: `shadow-xl`
- Background: `bg-white dark:bg-gray-900`

### 2.2 Mobile Bottom Sheet (<1024px)

```
+------------------------------------------+
|  ========  <- Drag handle                |
+------------------------------------------+
|           Choose Your Avatar             |
+------------------------------------------+
|                                          |
|  [Emoji Avatars]     [Upload Custom]     |
|                                          |
|  +------+ +------+ +------+ +------+     |
|  | :)   | | :D   | | B)   | | <3   |     |
|  +------+ +------+ +------+ +------+     |
|                                          |
|  +------+ +------+ +------+ +------+     |
|  | :P   | | [?]  | | [?]  | | [?]  |     |
|  +------+ +------+ +------+ +------+     |
|                                          |
|  [Select Avatar] <- Full-width button    |
+------------------------------------------+
```

**Specifications:**
- Bottom sheet: slides up from bottom
- Max height: 90vh
- Drag handle: 40x4px, `bg-gray-300`
- Grid: 4 columns (mobile), 6 columns (tablet)

---

## 3. Avatar Grid Design

### 3.1 Avatar Cell States

```
AVAILABLE (Unlocked)          LOCKED                    SELECTED
+----------------+            +----------------+         +----------------+
|                |            |  +---------+   |         |  +----------+  |
|   :)           |            |  |  Lv.10  |   |         |  |   :D     |  |
|                |            |  +---------+   |         |  +----------+  |
|  [Common]      |            |     [?]        |         |  [Common] [v]  |
+----------------+            +----------------+         +----------------+
 bg-gray-50                    bg-gray-100/50             ring-2 ring-green-500
 border-gray-200               opacity-50                 ring-offset-2
```

### 3.2 Rarity Visual System

| Rarity    | Background              | Border               | Glow Effect        |
|-----------|-------------------------|----------------------|--------------------|
| Common    | `bg-gray-50`            | `border-gray-200`    | None               |
| Rare      | `bg-blue-50`            | `border-blue-300`    | Subtle blue        |
| Epic      | `bg-purple-50`          | `border-purple-300`  | Purple shimmer     |
| Legendary | `bg-gradient-gold`      | `border-yellow-400`  | Gold pulse         |

### 3.3 Rarity Badge Design

```
Common:     [*]      Gray badge, no icon
Rare:       [*]      Blue badge with star
Epic:       [**]     Purple badge with 2 stars
Legendary:  [***]    Gold badge with crown + 3 stars + shimmer animation
```

---

## 4. Custom Upload Tab Design

### 4.1 Upload Area

```
+--------------------------------------------------+
|                                                   |
|           [Cloud Upload Icon]                     |
|                                                   |
|     Drag & drop an image here, or                |
|              [Browse Files]                       |
|                                                   |
|     Supports: PNG, JPG, WEBP, HEIC (max 5MB)     |
|                                                   |
+--------------------------------------------------+
```

### 4.2 Image Cropper (After Upload)

```
+--------------------------------------------------+
|                                                   |
|  +------------------------------------------+    |
|  |                                          |    |
|  |      +------------------+                |    |
|  |      |                  |                |    |
|  |      |   [Crop Area]    |  <- Circular   |    |
|  |      |                  |     preview    |    |
|  |      +------------------+                |    |
|  |                                          |    |
|  +------------------------------------------+    |
|                                                   |
|  [-] ========[========]======== [+]  <- Zoom     |
|                                                   |
|  [Rotate Left]  [Rotate Right]  [Reset]          |
|                                                   |
|  [Cancel]                        [Save Avatar]   |
+--------------------------------------------------+
```

**Cropper Specifications:**
- Circular crop mask (avatar is round)
- Zoom range: 0.5x - 3x
- Touch/pinch zoom support
- Drag to pan image
- Real-time preview

---

## 5. Micro-Interactions & Animations

### 5.1 Entry Animations

| Element           | Animation                | Duration | Easing           |
|-------------------|--------------------------|----------|------------------|
| Modal backdrop    | Fade in                  | 150ms    | ease-out         |
| Modal container   | Scale 0.95 -> 1 + fade   | 200ms    | ease-out         |
| Bottom sheet      | Slide up from bottom     | 250ms    | cubic-bezier     |
| Avatar cells      | Staggered fade-in        | 50ms each| ease-out         |

### 5.2 Hover/Focus States

```css
/* Available avatar hover */
.avatar-cell:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: 150ms ease-out;
}

/* Legendary shimmer effect */
.legendary {
  animation: shimmer 2s infinite;
  background: linear-gradient(
    135deg,
    #ffd700 0%,
    #fff8dc 50%,
    #ffd700 100%
  );
}

/* Selected pulse */
.selected {
  animation: selectedPulse 2s infinite;
}

@keyframes selectedPulse {
  0%, 100% { ring-offset: 2px; }
  50% { ring-offset: 4px; }
}
```

### 5.3 Feedback Animations

| Action             | Feedback                          |
|--------------------|-----------------------------------|
| Avatar selected    | Bounce + checkmark appears        |
| Upload started     | Progress ring animation           |
| Upload complete    | Confetti burst + success toast    |
| Locked avatar tap  | Shake + "Unlock at Lv.X" tooltip  |

### 5.4 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Fun Factor Elements

### 6.1 Delightful Details

1. **Rarity Reveal**: When hovering legendary avatars, subtle particle effects
2. **Unlock Preview**: Locked avatars show silhouette + "Coming at Level X"
3. **Selection Celebration**: Brief confetti when selecting avatar
4. **Progress Indicator**: "3 more levels to unlock Dragon King!"
5. **Sound Effects** (optional): Soft UI sounds for selection (toggleable)

### 6.2 Gamification Integration

```
+--------------------------------------------------+
|  Your Collection: 12/48 avatars unlocked          |
|  [========........] 25%                          |
|                                                   |
|  Next unlock: "Money Master" at Level 15 (2 more!)|
+--------------------------------------------------+
```

---

## 7. Color Palette Reference

| Purpose          | Light Mode            | Dark Mode              |
|------------------|----------------------|------------------------|
| Background       | `#FFFFFF`            | `#1F2937` (gray-800)  |
| Card background  | `#F9FAFB` (gray-50)  | `#374151` (gray-700)  |
| Primary action   | `#4CAF50` (green)    | `#22C55E` (green-500) |
| Selected ring    | `#22C55E`            | `#22C55E`             |
| Rarity: Common   | `#9CA3AF` (gray-400) | `#6B7280`             |
| Rarity: Rare     | `#3B82F6` (blue-500) | `#60A5FA`             |
| Rarity: Epic     | `#8B5CF6` (purple)   | `#A78BFA`             |
| Rarity: Legend   | `#F59E0B` (amber)    | `#FBBF24`             |

---

## 8. Typography

| Element          | Font                | Size     | Weight  |
|------------------|---------------------|----------|---------|
| Modal title      | Noto Sans JP/Inter  | 20px     | 600     |
| Tab labels       | Inter               | 14px     | 500     |
| Rarity badges    | Inter               | 10px     | 700     |
| Unlock level     | Inter               | 12px     | 600     |
| Helper text      | Noto Sans JP        | 14px     | 400     |

---

## 9. Responsive Breakpoints

| Breakpoint    | Grid Columns | Avatar Size | Modal Width   |
|---------------|--------------|-------------|---------------|
| 320-479px     | 4            | 64px        | Full width    |
| 480-639px     | 5            | 72px        | Full width    |
| 640-767px     | 5            | 80px        | Full width    |
| 768-1023px    | 6            | 80px        | Full width    |
| 1024px+       | 6            | 72px        | 576px max     |

---

## 10. Accessibility Specifications

### 10.1 Keyboard Navigation

| Key           | Action                                   |
|---------------|------------------------------------------|
| Tab           | Move focus between tabs/buttons          |
| Enter/Space   | Select focused avatar / activate button  |
| Arrow keys    | Navigate within avatar grid              |
| Escape        | Close modal                              |

### 10.2 Screen Reader Support

```html
<!-- Avatar cell -->
<button
  role="option"
  aria-selected="true|false"
  aria-label="Happy Face emoji, Common rarity, currently selected"
  aria-disabled="false"
>

<!-- Locked avatar -->
<button
  role="option"
  aria-disabled="true"
  aria-label="Money Master emoji, Epic rarity, unlocks at level 15"
>

<!-- Tab panel -->
<div
  role="tabpanel"
  aria-labelledby="emoji-tab"
  aria-live="polite"
>
```

### 10.3 Focus Management

1. When modal opens: Focus first interactive element
2. Focus trapped within modal
3. On close: Return focus to trigger element
4. Skip links for long avatar grids

---

## 11. Error States

### 11.1 Upload Errors

```
+--------------------------------------------------+
|  [Warning Icon]                                   |
|                                                   |
|  Upload Failed                                    |
|  File too large (max 5MB)                        |
|                                                   |
|  [Try Again]                                      |
+--------------------------------------------------+
```

### 11.2 Network Errors

```
+--------------------------------------------------+
|  [Offline Icon]                                   |
|                                                   |
|  Can't load avatars                              |
|  Check your connection and try again             |
|                                                   |
|  [Retry]                                          |
+--------------------------------------------------+
```

---

## 12. Loading States

### 12.1 Initial Load

```
+------+ +------+ +------+ +------+
|  ~~  | |  ~~  | |  ~~  | |  ~~  |  <- Skeleton cells
+------+ +------+ +------+ +------+     with shimmer
```

### 12.2 Avatar Selection

```
+----------------+
|                |
|   [Spinner]    |  <- Small spinner overlay
|                |     on selected avatar
+----------------+
```

---

## Next Steps

See [Phase 02: Component Architecture](./phase-02-component-architecture.md) for implementation details.
