import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { BudgetTracking } from '@/types'

interface BudgetCoverageIndicatorProps {
  tracking: BudgetTracking
  className?: string
}

export function BudgetCoverageIndicator({
  tracking,
  className
}: BudgetCoverageIndicatorProps) {
  const { t } = useTranslation('common')

  const coverage = useMemo(() => {
    const uncategorizedAmount = tracking.uncategorized_spending || 0
    const totalActualSpending = tracking.total_spent + uncategorizedAmount
    if (totalActualSpending <= 0) return 100
    return Math.round((tracking.total_spent / totalActualSpending) * 100)
  }, [tracking])

  const hasUncategorized = (tracking.uncategorized_spending || 0) > 0
  const isHealthy = coverage >= 90

  if (!hasUncategorized) return null

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', className)}>
      {isHealthy ? (
        <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500',
                isHealthy ? 'bg-green-500' : 'bg-amber-500'
              )}
              style={{ width: `${coverage}%` }}
            />
          </div>
          <span className={cn(
            'text-xs font-semibold tabular-nums flex-shrink-0',
            isHealthy ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
          )}>
            {coverage}%
          </span>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          {t('budget.coverage.label')}
        </p>
      </div>
    </div>
  )
}
