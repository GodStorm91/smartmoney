import { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { cn } from '@/utils/cn'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  disabled?: boolean
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled,
  })

  const progress = Math.min(pullDistance / 80, 1)
  const showIndicator = pullDistance > 10 || isRefreshing

  return (
    <div
      className={cn('relative overflow-auto', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-10 transition-opacity duration-200',
          showIndicator ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: Math.max(pullDistance - 40, 8),
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full',
            'bg-white dark:bg-gray-800 shadow-lg',
            'border border-gray-200 dark:border-gray-700'
          )}
        >
          <RefreshCw
            size={20}
            className={cn(
              'text-primary-600 transition-transform',
              isRefreshing && 'animate-spin'
            )}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
