# React Bottom Sheet Component Research

## Executive Summary

Bottom sheets are critical for mobile-first web apps. Three proven libraries dominate the ecosystem, each with distinct trade-offs. Focus trap + keyboard support are non-negotiable for accessibility. Hardware-accelerated animations ensure 60fps performance.

## 1. Recommended Libraries

### react-spring-bottom-sheet (Recommended)
- **Pros**: GPU-accelerated animations (CSS transforms), minimal rerenders, built on battle-tested react-spring, excellent snap points API
- **Cons**: Slightly larger bundle, requires react-spring dependency
- **Best for**: Complex gesture interactions, precise animation control
- **Bundle**: ~10KB minified
- **GitHub**: [stipsan/react-spring-bottom-sheet](https://github.com/stipsan/react-spring-bottom-sheet)

### Vaul (Emerging Alternative)
- **Pros**: Lightweight, designed for modern React patterns, cross-platform roadmap
- **Cons**: Younger ecosystem, fewer battle-tested examples
- **Best for**: Simple implementations, minimal dependencies
- **Note**: Often combined with Gorhom for cross-platform solutions
- **GitHub**: [adebayoileri/universal-bottom-sheet](https://github.com/adebayoileri/universal-bottom-sheet)

### react-modal-sheet
- **Pros**: Built-in keyboard avoidance, enhanced scroll control, disableDismiss prop
- **Cons**: Less popular, smaller community
- **Best for**: Bottom sheets with keyboard-friendly input
- **npm**: [react-modal-sheet](https://www.npmjs.com/package/react-modal-sheet)

## 2. Accessibility Requirements (Critical)

### Focus Management
- **Focus Trap**: Isolate keyboard navigation within sheet; redirect focus loops
- **Initial Focus**: Move focus to first focusable element on open (usually close button or first form input)
- **Return Focus**: Restore focus to trigger element on close
- **Library**: Use `focus-trap-react` or implement with `focus-trap`

### ARIA Attributes (Mandatory)
```html
<div role="dialog"
     aria-modal="true"
     aria-labelledby="sheet-title"
     aria-describedby="sheet-description">
```

### Keyboard Support
- **Escape Key**: Close sheet (standard pattern)
- **Tab/Shift+Tab**: Navigate within sheet, trap at boundaries
- **Background**: Set `aria-hidden="true"` on page content while sheet open
- **Inert**: Consider `inert` attribute (experimental) or explicit management

### Screen Reader Announcements
- Announce sheet open/close state
- Use `aria-label` for interactive regions
- Avoid generic "dialog" labels; be specific ("Budget filter options")

## 3. Touch Gesture Handling

### Drag-to-Close Pattern
- Drag sheet down beyond threshold (~20-30% of sheet height) to dismiss
- Smooth physics-based deceleration for natural feel
- Disabled during scroll within scrollable content (prevent accidental close)

### Snap Points
Define discrete positions sheet can occupy:
```javascript
snapPoints={[0.25, 0.5, 0.75, 1]}  // 25%, 50%, 75%, 100% of viewport
```
- Common: preview (25%), half (50%), full (100%)
- Use hardware scroll-snap for smooth UX: `scroll-snap-type: y mandatory`

### Gesture Libraries
- **react-spring-bottom-sheet**: Uses `react-use-gesture` internally (abstracts complexity)
- **React Native Gesture Handler**: Best-in-class, but React Native focused
- **Web**: Leverage CSS `touch-action` property to prevent conflicts

## 4. Performance Optimization

### Animation Strategy
- **GPU Acceleration**: Use CSS transforms/transitions (translate, scale, opacity)
- **Avoid**: Layout thrashing (width, height, left, top changes)
- **Target**: 60fps on mid-range devices (iPhone 11, Samsung A12)

### Rendering
- Memoize content component: `React.memo(SheetContent)`
- Lazy load content inside sheet (defer heavy computations)
- Use `will-change: transform` sparingly; remove after interaction

### Scroll Performance
- Enable passive event listeners (default in modern browsers)
- Use CSS `overscroll-behavior: none` to prevent page bounce during sheet drag
- Implement virtual scrolling for long lists inside sheet

### Network & Bundle
- react-spring-bottom-sheet: ~10KB
- Vaul: ~3-5KB (smaller alternative)
- Consider code-splitting: lazy load sheet component

## 5. Implementation Checklist

- [ ] Choose library (recommend: react-spring-bottom-sheet)
- [ ] Implement focus trap on open/close
- [ ] Add ARIA attributes (role, aria-modal, aria-labelledby)
- [ ] Test keyboard: Tab, Shift+Tab, Escape
- [ ] Test touch: drag-to-close, scroll inside sheet
- [ ] Test screen reader (VoiceOver, NVDA)
- [ ] Measure performance: DevTools > Performance tab, target 60fps
- [ ] Test on iOS Safari, Android Chrome (gesture edge cases)
- [ ] Provide visible close button (don't rely on swipe-only)
- [ ] Handle background scroll: `overflow: hidden` on body

## 6. Quick Recipe (react-spring-bottom-sheet)

```bash
npm install react-spring-bottom-sheet react-spring
```

```jsx
import { BottomSheet } from 'react-spring-bottom-sheet'
import FocusTrap from 'focus-trap-react'

export function MySheet() {
  const [open, setOpen] = useState(false)
  return (
    <BottomSheet
      open={open}
      onDismiss={() => setOpen(false)}
      snapPoints={[0.5, 1]}
    >
      <FocusTrap active={open}>
        <div role="dialog" aria-modal="true" aria-labelledby="title">
          <h2 id="title">Sheet Title</h2>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      </FocusTrap>
    </BottomSheet>
  )
}
```

## Trade-offs Summary

| Criterion | react-spring-bottom-sheet | Vaul | react-modal-sheet |
|-----------|---------------------------|------|-------------------|
| Performance | Excellent (GPU accel) | Good | Good |
| Bundle Size | 10KB | 3-5KB | ~8KB |
| Accessibility | Built-in support | Good | Good |
| Gesture Control | Excellent | Good | Good |
| Community | Large | Growing | Small |
| Learning Curve | Moderate | Low | Low |

**Recommendation**: Use `react-spring-bottom-sheet` for mobile-first apps with complex interactions; use `Vaul` for simpler use cases prioritizing minimal bundle.

---

### Sources
- [react-spring-bottom-sheet GitHub](https://github.com/stipsan/react-spring-bottom-sheet)
- [Focus Trap Implementation Guide](https://okenlabs.com/blog/accessibility-implementing-focus-traps/)
- [Accessible Modal Dialogs](https://testparty.ai/blog/modal-dialog-accessibility/)
- [Native-like Bottom Sheets on Web](https://viliket.github.io/posts/native-like-bottom-sheets-on-the-web/)
- [Focus Trap Library](https://github.com/focus-trap/focus-trap)
