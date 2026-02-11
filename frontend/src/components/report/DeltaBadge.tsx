import { ArrowUp, ArrowDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface DeltaBadgeProps {
  value: number | null | undefined
  invertColor?: boolean // true for expenses (down = green)
  className?: string
}

export function DeltaBadge({ value, invertColor = false, className }: DeltaBadgeProps) {
  const { t } = useTranslation('common')

  if (value === null || value === undefined) {
    return (
      <span className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium',
        'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        className,
      )}>
        {t('report.deltaNew')}
      </span>
    )
  }

  if (value === 0) {
    return (
      <span className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium',
        'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        className,
      )}>
        0%
      </span>
    )
  }

  const isPositive = value > 0
  const isGood = invertColor ? !isPositive : isPositive
  const Icon = isPositive ? ArrowUp : ArrowDown

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium',
      isGood
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      className,
    )}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}
