import { useState, useCallback, useRef, useEffect } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  isPulling: boolean
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const startY = useRef(0)
  const currentY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return

    // Only start pull if at top of scroll container
    const target = e.currentTarget as HTMLElement
    if (target.scrollTop > 0) return

    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [disabled, isRefreshing])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0) {
      // Apply resistance to make it feel natural
      const resistance = 0.4
      setPullDistance(Math.min(diff * resistance, threshold * 1.5))
    }
  }, [isPulling, disabled, isRefreshing, threshold])

  const onTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return

    setIsPulling(false)

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold) // Keep at threshold while refreshing

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh])

  // Reset on unmount
  useEffect(() => {
    return () => {
      setPullDistance(0)
      setIsRefreshing(false)
      setIsPulling(false)
    }
  }, [])

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}
