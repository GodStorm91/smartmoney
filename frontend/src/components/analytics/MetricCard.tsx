import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface MetricCardProps {
  label: string
  value: string
  change?: number | null
  trend?: 'positive' | 'negative' | 'neutral'
  subtitle?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  change,
  trend = 'neutral',
  subtitle,
  className,
}: MetricCardProps) {
  const { t } = useTranslation('common')

  const getTrendColor = () => {
    if (trend === 'positive') return 'text-green-600 dark:text-green-400'
    if (trend === 'negative') return 'text-red-600 dark:text-red-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  const getTrendIcon = () => {
    if (change === null || change === undefined) return null
    if (change > 0) return '↑'
    if (change < 0) return '↓'
    return '→'
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm',
        'border border-gray-100 dark:border-gray-700',
        className
      )}
    >
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
        {value}
      </p>
      {(change !== null && change !== undefined) && (
        <div className={cn('flex items-center gap-1 mt-1', getTrendColor())}>
          <span className="text-sm font-medium">
            {getTrendIcon()} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">
            {t('analytics.vsLastPeriod')}
          </span>
        </div>
      )}
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          {subtitle}
        </p>
      )}
    </div>
  )
}
