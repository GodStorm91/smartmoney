import { cn } from '@/utils/cn'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export type BudgetStatus = 'on_track' | 'warning' | 'exceeded'

interface StatusBadgeProps {
  status: BudgetStatus
  percentage: number
  className?: string
  showLabel?: boolean
}

/**
 * Determine budget status based on percentage spent
 * - on_track: < 80% used
 * - warning: 80-95% used
 * - exceeded: > 95% or exceeded
 */
export function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 95) return 'exceeded'
  if (percentage >= 80) return 'warning'
  return 'on_track'
}

const statusConfig = {
  on_track: {
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    label: 'On Track',
    ariaLabel: 'Budget on track',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    label: 'Warning',
    ariaLabel: 'Budget warning - approaching limit',
  },
  exceeded: {
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Exceeded',
    ariaLabel: 'Budget exceeded',
  },
}

export function StatusBadge({ status, percentage, className, showLabel = false }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full',
        showLabel ? 'px-2 py-0.5' : 'p-1',
        config.bgColor,
        className
      )}
      role="status"
      aria-label={`${config.ariaLabel}, ${percentage.toFixed(0)}% of budget used`}
    >
      {/* 24x24px visual, wrapped in 44x44px touch area via parent padding */}
      <Icon className={cn('w-4 h-4 flex-shrink-0', config.iconColor)} aria-hidden="true" />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.iconColor)}>
          {config.label}
        </span>
      )}
    </div>
  )
}

/**
 * Mini status badge for compact displays (category scroll cards)
 */
export function StatusBadgeMini({ status, className }: { status: BudgetStatus; className?: string }) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn('flex-shrink-0', className)}
      role="status"
      aria-label={config.ariaLabel}
    >
      <Icon className={cn('w-3.5 h-3.5', config.iconColor)} aria-hidden="true" />
    </div>
  )
}
