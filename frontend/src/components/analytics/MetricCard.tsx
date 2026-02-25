import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface MetricCardProps {
  label: string
  value: string
  change?: number | null
  trend?: 'positive' | 'negative' | 'neutral'
  subtitle?: string
  className?: string
  hero?: boolean
}

export function MetricCard({
  label,
  value,
  change,
  trend = 'neutral',
  subtitle,
  className,
  hero = false,
}: MetricCardProps) {
  const { t } = useTranslation('common')

  const getTrendColor = () => {
    if (trend === 'positive') return 'text-income-600 dark:text-income-300'
    if (trend === 'negative') return 'text-expense-600 dark:text-expense-300'
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
        'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card',
        'border border-gray-100 dark:border-gray-700',
        className
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </p>
      <p className={cn(
        'font-extrabold tracking-tight text-gray-900 dark:text-gray-100 font-numbers truncate',
        hero ? 'text-3xl sm:text-4xl tracking-tighter' : 'text-2xl'
      )}>
        {value}
      </p>
      {(change !== null && change !== undefined) && (
        <div className={cn('flex items-center gap-1.5 mt-1.5', getTrendColor())}>
          <span className="text-sm font-semibold">
            {getTrendIcon()} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">
            {t('analytics.vsLastPeriod')}
          </span>
        </div>
      )}
      {subtitle && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1.5 truncate">
          {subtitle}
        </p>
      )}
    </div>
  )
}
