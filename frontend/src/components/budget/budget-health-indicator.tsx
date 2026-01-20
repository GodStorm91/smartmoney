import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import type { BudgetTracking } from '@/types'

interface BudgetHealthIndicatorProps {
  totalBudget: number
  totalAllocated: number
  tracking: BudgetTracking
}

export function BudgetHealthIndicator({ totalBudget, totalAllocated, tracking }: BudgetHealthIndicatorProps) {
  const { t } = useTranslation('common')

  const health = useMemo(() => {
    const allocatedPercent = totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0
    const remaining = totalBudget - totalAllocated
    const spendingPercent = tracking.total_budgeted > 0 ? (tracking.total_spent / tracking.total_budgeted) * 100 : 0

    const overBudgetCategories = tracking.categories.filter(c => c.status === 'red' || c.status === 'orange').length
    const warningCategories = tracking.categories.filter(c => c.status === 'yellow').length
    const healthyCategories = tracking.categories.filter(c => c.status === 'green').length

    let status: 'excellent' | 'good' | 'fair' | 'poor'
    let message: string

    if (overBudgetCategories > 0) {
      status = 'poor'
      message = t('budget.health.overBudget', { count: overBudgetCategories })
    } else if (spendingPercent > 100) {
      status = 'poor'
      message = t('budget.health.exceededTotal')
    } else if (spendingPercent > 90) {
      status = 'fair'
      message = t('budget.health.warningNearLimit')
    } else if (allocatedPercent > 100) {
      status = 'fair'
      message = t('budget.health.overAllocated')
    } else if (allocatedPercent > 95) {
      status = 'good'
      message = t('budget.health.almostFull')
    } else {
      status = 'excellent'
      message = t('budget.health.onTrack')
    }

    return {
      allocatedPercent,
      remaining,
      spendingPercent,
      overBudgetCategories,
      warningCategories,
      healthyCategories,
      status,
      message,
      ringProgress: Math.min(100, Math.max(0, 100 - allocatedPercent)),
    }
  }, [totalBudget, totalAllocated, tracking, t])

  const getRingColor = () => {
    switch (health.status) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-blue-500'
      case 'fair': return 'text-yellow-500'
      case 'poor': return 'text-red-500'
    }
  }

  const getBgColor = () => {
    switch (health.status) {
      case 'excellent': return 'bg-green-50 dark:bg-green-900/30'
      case 'good': return 'bg-blue-50 dark:bg-blue-900/30'
      case 'fair': return 'bg-yellow-50 dark:bg-yellow-900/30'
      case 'poor': return 'bg-red-50 dark:bg-red-900/30'
    }
  }

  return (
    <Card className={cn('p-4', getBgColor())}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${Math.min(health.allocatedPercent, 100) * 1.76} 176`}
                className={cn('transition-all duration-500', getRingColor())}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">
                {Math.round(health.allocatedPercent)}%
              </span>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {t('budget.health.title')}
            </p>
            <p className={cn(
              'text-sm',
              health.status === 'poor' ? 'text-red-600 dark:text-red-400' :
              health.status === 'fair' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-green-600 dark:text-green-400'
            )}>
              {health.message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">{health.overBudgetCategories}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">{health.warningCategories}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">{health.healthyCategories}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
