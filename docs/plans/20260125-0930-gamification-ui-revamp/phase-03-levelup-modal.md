# Phase 03: Level Up Modal + Animations

**Date:** 2026-01-25 | **Priority:** Medium | **Status:** Pending | **Est:** 2h

---

## Context

- [Main Plan](./plan.md)
- [Celebration Research](./research/researcher-02-celebration-animations.md)

## Overview

Create full-screen level-up celebration modal with canvas-confetti. Add micro-animations for XP progress and streak updates.

## Dependencies

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

## Requirements

### LevelUpModal
- Trigger: When `level_up` property exists in XP response
- Full-screen dark overlay
- Centered modal with level number
- Confetti animation (150 particles, 2s)
- Auto-dismiss after 5s or on tap

### Micro-animations
- XP bar: smooth fill with shimmer
- Streak counter: bounce scale on increment
- "Next to unlock" progress: pulse when >75%

## Implementation Steps

### Step 1: Install canvas-confetti

```bash
cd frontend && npm install canvas-confetti && npm install -D @types/canvas-confetti
```

### Step 2: Create LevelUpModal.tsx (~70 lines)

```typescript
// frontend/src/components/gamification/LevelUpModal.tsx
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface LevelUpModalProps {
  open: boolean;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ open, newLevel, onClose }: LevelUpModalProps): JSX.Element | null {
  useEffect(() => {
    if (open) {
      // Fire confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6'],
        disableForReducedMotion: true,
      });

      // Auto-dismiss after 5s
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div className="text-center animate-scale-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-4xl font-bold text-white mb-2">Level {newLevel}!</h2>
        <p className="text-white/80">Keep up the great work!</p>
        <button className="mt-6 px-6 py-2 bg-white rounded-full font-semibold">
          Continue
        </button>
      </div>
    </div>
  );
}
```

### Step 3: Add CSS animation (tailwind.config.js)

```javascript
// tailwind.config.js - add to theme.extend.keyframes
keyframes: {
  'scale-in': {
    '0%': { transform: 'scale(0.5)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  'pulse-glow': {
    '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.5)' },
    '50%': { boxShadow: '0 0 0 8px rgba(59, 130, 246, 0)' },
  },
},
animation: {
  'scale-in': 'scale-in 0.4s ease-out',
  'pulse-glow': 'pulse-glow 2s infinite',
},
```

### Step 4: Integrate level-up detection

Update GamificationDashboard.tsx:

```typescript
import { LevelUpModal } from './LevelUpModal';

// Add state
const [levelUpData, setLevelUpData] = useState<{ newLevel: number } | null>(null);

// Check for level up in trackLogin response
useEffect(() => {
  const trackLogin = async () => {
    const result = await gamificationService.trackLogin();
    if (result.level_up) {
      setLevelUpData({ newLevel: result.level_up.new_level });
    }
  };
  trackLogin();
}, []);

// Render modal
<LevelUpModal
  open={!!levelUpData}
  newLevel={levelUpData?.newLevel ?? 0}
  onClose={() => setLevelUpData(null)}
/>
```

### Step 5: Add micro-animations

**XP Progress Bar shimmer (HeroProgressCard):**
```typescript
<div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
    style={{ width: `${progressPercent}%` }}
  />
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
</div>
```

**Progress pulse (NextToUnlock):**
```typescript
<div className={`h-2 rounded-full ${progress > 75 ? 'animate-pulse-glow' : ''}`}>
  {/* progress bar */}
</div>
```

## Todo

- [ ] Install canvas-confetti
- [ ] Create `LevelUpModal.tsx`
- [ ] Add Tailwind keyframes
- [ ] Integrate level-up detection
- [ ] Add XP bar shimmer animation
- [ ] Add progress pulse animation
- [ ] Test reduced-motion preference

## Success Criteria

- [ ] Confetti fires on level up
- [ ] Modal displays new level
- [ ] Auto-dismiss after 5s
- [ ] Click to dismiss works
- [ ] XP bar animates smoothly
- [ ] Progress pulses at >75%
- [ ] Respects prefers-reduced-motion
