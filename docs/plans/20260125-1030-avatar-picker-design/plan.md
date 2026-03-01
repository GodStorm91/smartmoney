# Avatar Picker UI Design Plan

**Date**: 2026-01-25
**Priority**: High
**Status**: In Progress

---

## Overview

Design a modern, fun, and accessible avatar picker for SmartMoney's gamification system that works seamlessly on both mobile and desktop.

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | UI/UX Design & Wireframes | Complete |
| 02 | Component Architecture | Complete |
| 03 | Implementation Guide | Complete |

## Key Documents

- [Phase 01: UI/UX Design](./phase-01-ui-ux-design.md)
- [Phase 02: Component Architecture](./phase-02-component-architecture.md)
- [Phase 03: Implementation Guide](./phase-03-implementation-guide.md)

## Problem Statement

Current `ProfileBottomSheet` uses `BottomSheet` component which has `lg:hidden` class, making it invisible on desktop (1024px+). Users on desktop cannot change their avatar.

## Solution Summary

Create a new `AvatarPickerModal` component using `ResponsiveModal` pattern (already exists in codebase) which:
- Shows as bottom sheet on mobile
- Shows as centered modal on desktop
- Includes tabbed interface: Emoji Avatars | Custom Upload
- Features image crop/zoom for uploads
- Maintains fun, gamified aesthetic

## Success Criteria

1. Works on all breakpoints (320px - 2560px+)
2. Keyboard navigable (Tab, Enter, Escape, Arrow keys)
3. Screen reader accessible (ARIA labels, live regions)
4. Touch targets >= 44x44px
5. Animations respect `prefers-reduced-motion`
6. < 100ms interaction response time
