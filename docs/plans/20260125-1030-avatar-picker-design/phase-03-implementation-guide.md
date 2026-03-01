# Phase 03: Implementation Guide - Avatar Picker

**Date**: 2026-01-25
**Status**: Complete

---

## 1. Quick Start

### 1.1 Replace ProfileBottomSheet Usage

```typescript
// Before (broken on desktop)
<ProfileBottomSheet isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />

// After (works everywhere)
<AvatarPickerModal isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />
```

### 1.2 Install Dependencies

```bash
npm install react-easy-crop focus-trap-react
```

---

## 2. Core Component Implementation

### 2.1 AvatarPickerModal.tsx

```typescript
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { EmojiAvatarGrid } from './EmojiAvatarGrid'
import { CustomUploadPanel } from './CustomUploadPanel'
import { Button } from '@/components/ui/Button'
import { useAvatarPicker } from '@/hooks/useAvatarPicker'
import { cn } from '@/utils/cn'

interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AvatarPickerModal({ isOpen, onClose }: AvatarPickerModalProps) {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<'emoji' | 'upload'>('emoji')
  const [pendingAvatarId, setPendingAvatarId] = useState<number | null>(null)
  const { currentAvatarId, activateAvatar } = useAvatarPicker()
  const triggerRef = useRef<HTMLElement | null>(null)

  // Store trigger element for focus return
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement
    }
  }, [isOpen])

  const handleClose = () => {
    triggerRef.current?.focus()
    onClose()
  }

  const handleConfirm = async () => {
    if (pendingAvatarId && pendingAvatarId !== currentAvatarId) {
      await activateAvatar(pendingAvatarId)
    }
    handleClose()
  }

  const tabs = [
    { id: 'emoji', label: t('gamification.profile.emojiAvatars') || 'Emoji Avatars' },
    { id: 'upload', label: t('gamification.profile.uploadCustom') || 'Upload Custom' },
  ]

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('gamification.profile.chooseAvatar') || 'Choose Avatar'}
      size="lg"
    >
      {/* Tab Navigation */}
      <div role="tablist" className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id as 'emoji' | 'upload')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[300px]">
        {activeTab === 'emoji' && (
          <EmojiAvatarGrid
            selectedId={pendingAvatarId ?? currentAvatarId}
            onSelect={setPendingAvatarId}
          />
        )}
        {activeTab === 'upload' && (
          <CustomUploadPanel onUploadComplete={handleClose} />
        )}
      </div>

      {/* Footer */}
      {activeTab === 'emoji' && (
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!pendingAvatarId || pendingAvatarId === currentAvatarId}
          >
            {t('gamification.profile.selectAvatar') || 'Select Avatar'}
          </Button>
        </div>
      )}
    </ResponsiveModal>
  )
}
```

---

## 3. Avatar Grid Component

### 3.1 EmojiAvatarGrid.tsx

```typescript
import { useMemo, useRef } from 'react'
import { useAvatarPicker } from '@/hooks/useAvatarPicker'
import { AvatarCell } from './AvatarCell'
import { RarityFilterBar, RarityFilter } from './RarityFilterBar'
import { CollectionProgress } from './CollectionProgress'
import { useGridKeyboardNav } from '@/hooks/useGridKeyboardNav'
import { useState } from 'react'

interface EmojiAvatarGridProps {
  selectedId: number | null | undefined
  onSelect: (id: number) => void
}

export function EmojiAvatarGrid({ selectedId, onSelect }: EmojiAvatarGridProps) {
  const { avatars, userLevel, categorizedAvatars } = useAvatarPicker()
  const [filter, setFilter] = useState<RarityFilter>('all')
  const gridRef = useRef<HTMLDivElement>(null)

  const filteredAvatars = useMemo(() => {
    if (filter === 'all') return avatars
    return avatars.filter(a => a.rarity === filter)
  }, [avatars, filter])

  const { focusedIndex } = useGridKeyboardNav(
    gridRef,
    filteredAvatars.length,
    6, // columns
    (index) => {
      const avatar = filteredAvatars[index]
      if (avatar.unlock_level <= userLevel) {
        onSelect(avatar.id)
      }
    }
  )

  return (
    <div>
      <RarityFilterBar activeFilter={filter} onFilterChange={setFilter} />

      <CollectionProgress
        unlocked={categorizedAvatars.available.length}
        total={avatars.length}
      />

      <div
        ref={gridRef}
        role="listbox"
        aria-label="Avatar selection"
        className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2 mt-4"
      >
        {filteredAvatars.map((avatar, index) => (
          <AvatarCell
            key={avatar.id}
            avatar={avatar}
            isSelected={avatar.id === selectedId}
            isLocked={avatar.unlock_level > userLevel}
            userLevel={userLevel}
            onSelect={() => onSelect(avatar.id)}
            isFocused={index === focusedIndex}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 4. Avatar Cell Component

### 4.1 AvatarCell.tsx

```typescript
import { Check, Lock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Avatar } from '@/services/rewards-service'

const rarityStyles = {
  common: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-600',
  rare: 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-500',
  epic: 'bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-500',
  legendary: 'bg-gradient-to-br from-yellow-100 to-amber-100 border-yellow-400 dark:from-yellow-900/30 dark:to-amber-900/30',
}

interface AvatarCellProps {
  avatar: Avatar
  isSelected: boolean
  isLocked: boolean
  userLevel: number
  onSelect: () => void
  isFocused?: boolean
}

export function AvatarCell({
  avatar,
  isSelected,
  isLocked,
  userLevel,
  onSelect,
  isFocused,
}: AvatarCellProps) {
  return (
    <button
      role="option"
      aria-selected={isSelected}
      aria-disabled={isLocked}
      aria-label={`${avatar.name}, ${avatar.rarity} rarity${isLocked ? `, unlocks at level ${avatar.unlock_level}` : ''}${isSelected ? ', selected' : ''}`}
      onClick={() => !isLocked && onSelect()}
      disabled={isLocked}
      className={cn(
        'relative aspect-square rounded-xl border-2 flex items-center justify-center text-2xl sm:text-3xl',
        'transition-all duration-150 focus:outline-none',
        rarityStyles[avatar.rarity as keyof typeof rarityStyles],
        isLocked && 'opacity-50 cursor-not-allowed',
        !isLocked && 'hover:scale-105 hover:shadow-lg active:scale-95',
        isSelected && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900',
        isFocused && 'ring-2 ring-blue-500 ring-offset-2',
        avatar.rarity === 'legendary' && !isLocked && 'animate-shimmer'
      )}
    >
      {avatar.emoji || '😊'}

      {/* Selected checkmark */}
      {isSelected && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 rounded-xl flex flex-col items-center justify-center">
          <Lock className="w-4 h-4 text-gray-400 mb-0.5" />
          <span className="text-xs font-medium text-gray-500">Lv.{avatar.unlock_level}</span>
        </div>
      )}

      {/* Rarity badge */}
      <span className={cn(
        'absolute bottom-1 left-1 text-[10px] font-bold uppercase px-1 rounded',
        avatar.rarity === 'common' && 'bg-gray-200 text-gray-600',
        avatar.rarity === 'rare' && 'bg-blue-200 text-blue-700',
        avatar.rarity === 'epic' && 'bg-purple-200 text-purple-700',
        avatar.rarity === 'legendary' && 'bg-yellow-200 text-yellow-700'
      )}>
        {avatar.rarity.charAt(0)}
      </span>
    </button>
  )
}
```

---

## 5. Image Cropper Integration

### 5.1 ImageCropper.tsx

```typescript
import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { ZoomIn, ZoomOut, RotateCcw, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getCroppedImg } from '@/utils/cropImage'

interface ImageCropperProps {
  imageUrl: string
  onCropComplete: (blob: Blob) => void
  onCancel: () => void
}

export function ImageCropper({ imageUrl, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropChange = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleSave = async () => {
    const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels, rotation)
    onCropComplete(croppedBlob)
  }

  return (
    <div className="space-y-4">
      {/* Cropper area */}
      <div className="relative h-64 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropChange}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-gray-100 rounded">
          <ZoomOut className="w-5 h-5" />
        </button>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-32"
        />
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-gray-100 rounded">
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setRotation(r => r - 90)} className="p-2 hover:bg-gray-100 rounded">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button onClick={() => setRotation(r => r + 90)} className="p-2 hover:bg-gray-100 rounded">
          <RotateCw className="w-5 h-5" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save Avatar</Button>
      </div>
    </div>
  )
}
```

---

## 6. CSS Additions

Add to `index.css`:

```css
/* Legendary shimmer */
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.animate-shimmer {
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
}

/* Modal animations */
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-modal-in {
  animation: modal-in 0.2s ease-out;
}
```

---

## 7. Testing Checklist

- [ ] Opens on mobile (< 1024px) as bottom sheet
- [ ] Opens on desktop (>= 1024px) as centered modal
- [ ] Avatar selection works with mouse click
- [ ] Arrow key navigation within grid
- [ ] Tab key moves between sections
- [ ] Escape closes modal
- [ ] Screen reader announces avatar info
- [ ] Locked avatars not selectable
- [ ] Custom upload accepts images
- [ ] HEIC conversion works
- [ ] Crop/zoom functional
- [ ] Respects prefers-reduced-motion

---

## 8. Migration Steps

1. Create `/components/gamification/avatar-picker/` directory
2. Copy component files from this guide
3. Update `GamificationDashboard.tsx` import
4. Add CSS animations to `index.css`
5. Install `react-easy-crop` if using image cropper
6. Test on mobile and desktop
7. Remove old `ProfileBottomSheet` usage
