import { useState, useRef, useCallback, ReactNode } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SwipeAction {
  icon: ReactNode
  label: string
  color: string
  onClick: () => void
}

interface SwipeActionsProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  threshold?: number
  disabled?: boolean
}

export function SwipeActions({
  children,
  onEdit,
  onDelete,
  leftActions,
  rightActions,
  threshold = 80,
  disabled = false,
}: SwipeActionsProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontalSwipe = useRef<boolean | null>(null)

  // Default actions
  const defaultLeftActions: SwipeAction[] = leftActions || (onEdit ? [{
    icon: <Edit2 size={20} />,
    label: 'Edit',
    color: 'bg-blue-500',
    onClick: onEdit,
  }] : [])

  const defaultRightActions: SwipeAction[] = rightActions || (onDelete ? [{
    icon: <Trash2 size={20} />,
    label: 'Delete',
    color: 'bg-red-500',
    onClick: onDelete,
  }] : [])

  const hasLeftActions = defaultLeftActions.length > 0
  const hasRightActions = defaultRightActions.length > 0

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontalSwipe.current = null
    setIsSwiping(true)
  }, [disabled])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || disabled) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = currentX - startX.current
    const diffY = currentY - startY.current

    // Determine if horizontal or vertical swipe on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY)
      }
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return

    // Prevent vertical scroll during horizontal swipe
    e.preventDefault()

    // Apply constraints based on available actions
    let newTranslateX = diffX
    if (!hasLeftActions && newTranslateX > 0) newTranslateX = 0
    if (!hasRightActions && newTranslateX < 0) newTranslateX = 0

    // Apply resistance at edges
    const maxSwipe = threshold * 1.2
    if (Math.abs(newTranslateX) > maxSwipe) {
      const excess = Math.abs(newTranslateX) - maxSwipe
      newTranslateX = Math.sign(newTranslateX) * (maxSwipe + excess * 0.2)
    }

    setTranslateX(newTranslateX)
  }, [isSwiping, disabled, hasLeftActions, hasRightActions, threshold])

  const onTouchEnd = useCallback(() => {
    if (!isSwiping) return
    setIsSwiping(false)

    // Snap to action or back
    if (translateX > threshold && hasLeftActions) {
      // Trigger left action (swipe right)
      defaultLeftActions[0]?.onClick()
      setTranslateX(0)
    } else if (translateX < -threshold && hasRightActions) {
      // Trigger right action (swipe left)
      defaultRightActions[0]?.onClick()
      setTranslateX(0)
    } else {
      // Snap back
      setTranslateX(0)
    }
  }, [isSwiping, translateX, threshold, hasLeftActions, hasRightActions, defaultLeftActions, defaultRightActions])

  const actionWidth = Math.abs(translateX)

  return (
    <div className="relative overflow-hidden">
      {/* Left action (revealed when swiping right) */}
      {hasLeftActions && translateX > 0 && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-center',
            defaultLeftActions[0]?.color
          )}
          style={{ width: actionWidth }}
        >
          <div className={cn(
            'flex flex-col items-center text-white transition-opacity',
            actionWidth > 40 ? 'opacity-100' : 'opacity-0'
          )}>
            {defaultLeftActions[0]?.icon}
            <span className="text-xs mt-1">{defaultLeftActions[0]?.label}</span>
          </div>
        </div>
      )}

      {/* Right action (revealed when swiping left) */}
      {hasRightActions && translateX < 0 && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center',
            defaultRightActions[0]?.color
          )}
          style={{ width: actionWidth }}
        >
          <div className={cn(
            'flex flex-col items-center text-white transition-opacity',
            actionWidth > 40 ? 'opacity-100' : 'opacity-0'
          )}>
            {defaultRightActions[0]?.icon}
            <span className="text-xs mt-1">{defaultRightActions[0]?.label}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className="relative bg-white dark:bg-gray-900"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
