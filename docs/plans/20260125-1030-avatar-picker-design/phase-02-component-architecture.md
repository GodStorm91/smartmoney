# Phase 02: Component Architecture - Avatar Picker

**Date**: 2026-01-25
**Status**: Complete

---

## 1. Component Hierarchy

```
AvatarPickerModal (Root)
├── ResponsiveModal (existing)
│   ├── ModalHeader
│   │   ├── Title
│   │   └── CloseButton
│   └── ModalContent
│       ├── TabNavigation
│       │   ├── TabButton (Emoji)
│       │   └── TabButton (Upload)
│       ├── TabPanel: EmojiAvatarGrid
│       │   ├── RarityFilterBar
│       │   ├── AvatarGrid
│       │   │   └── AvatarCell[] (mapped)
│       │   └── CollectionProgress
│       ├── TabPanel: CustomUploadPanel
│       │   ├── DropZone
│       │   ├── ImageCropper (conditional)
│       │   └── UploadProgress
│       └── ModalFooter
│           ├── CancelButton
│           └── ConfirmButton
└── Confetti (celebration overlay)
```

---

## 2. File Structure

```
frontend/src/components/gamification/avatar-picker/
├── index.ts                    # Barrel export
├── AvatarPickerModal.tsx       # Main modal container
├── EmojiAvatarGrid.tsx         # Emoji selection tab
├── AvatarCell.tsx              # Individual avatar button
├── CustomUploadPanel.tsx       # Upload tab content
├── ImageCropper.tsx            # Crop/zoom interface
├── RarityFilterBar.tsx         # Filter chips
├── CollectionProgress.tsx      # Progress indicator
└── avatar-picker.types.ts      # Shared TypeScript types
```

---

## 3. Core Component Interfaces

### 3.1 AvatarPickerModal

```typescript
interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onAvatarSelect?: (avatar: Avatar) => void
  currentAvatarId?: number
}
```

### 3.2 AvatarCell

```typescript
interface AvatarCellProps {
  avatar: Avatar
  isSelected: boolean
  isLocked: boolean
  userLevel: number
  onSelect: (avatar: Avatar) => void
  size?: 'sm' | 'md' | 'lg'
}
```

### 3.3 ImageCropper

```typescript
interface ImageCropperProps {
  imageUrl: string
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number  // 1:1 for avatar
}
```

---

## 4. State Management

### 4.1 Local State (useState)

```typescript
// AvatarPickerModal
const [activeTab, setActiveTab] = useState<'emoji' | 'upload'>('emoji')
const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null)
const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')

// CustomUploadPanel
const [uploadedImage, setUploadedImage] = useState<string | null>(null)
const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
const [isUploading, setIsUploading] = useState(false)
```

### 4.2 Server State (React Query)

```typescript
// Existing hooks from rewards-service.ts
const { data: avatars } = useAvatars(userLevel)
const { data: profile } = useProfile()
const { mutate: activateAvatar } = useActivateAvatar()
const { mutate: uploadCustomAvatar } = useUploadCustomAvatar()
```

---

## 5. Custom Hooks

### 5.1 useAvatarPicker

```typescript
// hooks/useAvatarPicker.ts
export function useAvatarPicker() {
  const { data: profile } = useProfile()
  const { data: stats } = useGamificationStats()
  const { data: avatars = [] } = useAvatars(stats?.current_level || 1)
  const { mutateAsync: activate } = useActivateAvatar()
  const { mutateAsync: upload } = useUploadCustomAvatar()

  const userLevel = stats?.current_level || 1
  const currentAvatarId = profile?.active_avatar?.id

  const categorizedAvatars = useMemo(() => ({
    available: avatars.filter(a => a.unlock_level <= userLevel),
    locked: avatars.filter(a => a.unlock_level > userLevel),
  }), [avatars, userLevel])

  return {
    avatars,
    categorizedAvatars,
    userLevel,
    currentAvatarId,
    activateAvatar: activate,
    uploadCustomAvatar: upload,
  }
}
```

### 5.2 useImageCropper

```typescript
// hooks/useImageCropper.ts
export function useImageCropper(imageUrl: string) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const handleCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const getCroppedImage = useCallback(async () => {
    return await getCroppedImg(imageUrl, croppedAreaPixels, rotation)
  }, [imageUrl, croppedAreaPixels, rotation])

  return {
    crop, setCrop,
    zoom, setZoom,
    rotation, setRotation,
    handleCropComplete,
    getCroppedImage,
  }
}
```

---

## 6. Keyboard Navigation Hook

```typescript
// hooks/useGridKeyboardNav.ts
export function useGridKeyboardNav(
  gridRef: RefObject<HTMLDivElement>,
  itemCount: number,
  columns: number,
  onSelect: (index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          setFocusedIndex(i => Math.min(i + 1, itemCount - 1))
          break
        case 'ArrowLeft':
          setFocusedIndex(i => Math.max(i - 1, 0))
          break
        case 'ArrowDown':
          setFocusedIndex(i => Math.min(i + columns, itemCount - 1))
          break
        case 'ArrowUp':
          setFocusedIndex(i => Math.max(i - columns, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onSelect(focusedIndex)
          break
      }
    }
    // ... listener setup
  }, [itemCount, columns, onSelect])

  return { focusedIndex, setFocusedIndex }
}
```

---

## 7. Animation Utilities

```typescript
// utils/avatar-animations.ts
export const avatarPickerAnimations = {
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },

  cell: {
    hover: { scale: 1.08 },
    tap: { scale: 0.95 },
    selected: {
      scale: [1, 1.1, 1],
      transition: { duration: 0.3 }
    }
  },

  staggerChildren: {
    animate: { transition: { staggerChildren: 0.03 } }
  }
}
```

---

## 8. Recommended Libraries

| Purpose              | Library                    | Rationale                        |
|----------------------|----------------------------|----------------------------------|
| Image cropping       | `react-easy-crop`          | Lightweight, touch-friendly      |
| Animations           | `framer-motion` (existing) | Already in project               |
| File handling        | Native + existing utils    | HEIC conversion already built    |
| Focus management     | `focus-trap-react`         | Accessibility compliance         |

---

## Next Steps

See [Phase 03: Implementation Guide](./phase-03-implementation-guide.md) for code examples.
