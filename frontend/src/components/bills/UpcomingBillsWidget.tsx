import { useTranslation } from 'react-i18next'
import { Calendar, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useUpcomingBills } from '@/hooks/useBills'
import { cn } from '@/utils/cn'
import type { Bill } from '@/types'
import { format, differenceInDays, isToday } from 'date-fns'

interface UpcomingBillsWidgetProps {
  limit?: number
  onViewAll?: () => void
  onBillClick?: (bill: Bill) => void
  className?: string
}

export function UpcomingBillsWidget({
  limit = 5,
  onViewAll,
  onBillClick,
  className
}: UpcomingBillsWidgetProps) {
  const { t } = useTranslation('common')
  const { data: upcomingBills, isLoading } = useUpcomingBills(limit + 2)

  const sortedBills = (upcomingBills?.bills || []).slice(0, limit)

  const getUrgencyColor = (bill: Bill) => {
    const dueDate = new Date(bill.due_date)
    if (bill.is_paid) return 'bg-green-500'
    if (isToday(dueDate)) return 'bg-orange-500'
    const days = differenceInDays(dueDate, new Date())
    if (days <= 3) return 'bg-red-500'
    if (days <= 7) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const totalDue = sortedBills.reduce((sum, bill) => {
    if (!bill.is_paid) return sum + Number(bill.amount)
    return sum
  }, 0)

  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('bills.upcoming.title')}
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-1" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
              </div>
              <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('bills.upcoming.title')}
          </h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            {t('common.view_all')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {sortedBills.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <p className="text-sm">{t('bills.upcoming.empty')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sortedBills.map(bill => {
              const dueDate = new Date(bill.due_date)
              const daysUntil = differenceInDays(dueDate, new Date())
              const isDueToday = isToday(dueDate)

              return (
                <div
                  key={bill.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer',
                    'hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                  onClick={() => onBillClick?.(bill)}
                >
                  <div className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    getUrgencyColor(bill)
                  )} />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {bill.name}
                    </p>
                    <p className={cn(
                      'text-xs',
                      isDueToday
                        ? 'text-orange-500 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {isDueToday
                        ? t('bills.due_today')
                        : daysUntil === 1
                          ? t('bills.tomorrow')
                          : t('bills.in_days', { count: daysUntil })}
                    </p>
                  </div>

                  <div className={cn(
                    'text-sm font-semibold',
                    bill.is_paid
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-gray-100'
                  )}>
                    ${Number(bill.amount).toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>

          {totalDue > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('bills.upcoming.total_due')}
                </span>
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                  ${totalDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
