import { useTranslation } from 'react-i18next'
import { Calendar, Bell, Repeat, MoreVertical } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import type { Bill } from '@/types'
import { format, differenceInDays, isPast, isToday } from 'date-fns'

interface BillCardProps {
  bill: Bill
  onClick?: (bill: Bill) => void
  onMarkPaid?: (bill: Bill) => void
  onEdit?: (bill: Bill) => void
  onDelete?: (bill: Bill) => void
  className?: string
}

export function BillCard({
  bill,
  onClick,
  onMarkPaid,
  onEdit,
  onDelete,
  className
}: BillCardProps) {
  const { t } = useTranslation('common')

  const getDueStatus = () => {
    const dueDate = new Date(bill.next_due_date)
    if (bill.is_paid) return { status: 'paid', label: t('bills.status.paid'), color: 'green' }
    if (isToday(dueDate)) return { status: 'today', label: t('bills.status.due_today'), color: 'orange' }
    if (isPast(dueDate)) return { status: 'overdue', label: t('bills.status.overdue'), color: 'red' }
    return { status: 'upcoming', label: t('bills.status.upcoming'), color: 'blue' }
  }

  const status = getDueStatus()
  const daysUntilDue = differenceInDays(new Date(bill.next_due_date), new Date())

  const recurrenceLabels: Record<string, string> = {
    weekly: t('bills.recurrence.weekly'),
    biweekly: t('bills.recurrence.biweekly'),
    monthly: t('bills.recurrence.monthly'),
    quarterly: t('bills.recurrence.quarterly'),
    yearly: t('bills.recurrence.yearly'),
    custom: t('bills.recurrence.custom'),
    none: t('bills.recurrence.none')
  }

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-shadow cursor-pointer',
        status.color === 'red' && 'border-l-4 border-l-red-500',
        status.color === 'orange' && 'border-l-4 border-l-orange-500',
        bill.is_paid && 'opacity-75',
        className
      )}
      onClick={() => onClick?.(bill)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {bill.name}
            </h4>
            <Badge
              variant={
                status.color === 'green' ? 'success' :
                status.color === 'red' ? 'error' :
                status.color === 'orange' ? 'warning' : 'default'
              }
            >
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(bill.next_due_date), 'MMM d, yyyy')}</span>
            </div>
            {bill.reminder_days_before > 0 && (
              <div className="flex items-center gap-1">
                <Bell className="w-4 h-4" />
                <span>{t('bills.reminder_days', { count: bill.reminder_days_before })}</span>
              </div>
            )}
          </div>

          {bill.recurrence_type && bill.recurrence_type !== 'none' && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <Repeat className="w-3 h-3" />
              <span>{recurrenceLabels[bill.recurrence_type] || bill.recurrence_type}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={cn(
              'text-lg font-semibold',
              bill.is_paid ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
            )}>
              ${Number(bill.amount).toFixed(2)}
            </p>
            {!bill.is_paid && daysUntilDue >= 0 && daysUntilDue <= 7 && (
              <p className={cn(
                'text-xs',
                daysUntilDue === 0 ? 'text-orange-500' : 'text-gray-400'
              )}>
                {daysUntilDue === 0
                  ? t('bills.due_today')
                  : t('bills.days_until_due', { count: daysUntilDue })}
              </p>
            )}
          </div>

          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="py-1">
                {!bill.is_paid && onMarkPaid && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkPaid(bill)
                    }}
                  >
                    {t('bills.actions.mark_paid')}
                  </button>
                )}
                {onEdit && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(bill)
                    }}
                  >
                    {t('bills.actions.edit')}
                  </button>
                )}
                {onDelete && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(bill)
                    }}
                  >
                    {t('bills.actions.delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {bill.notes && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {bill.notes}
        </p>
      )}

      {bill.category && (
        <div className="mt-2">
          <Badge variant="default">
            {bill.category}
          </Badge>
        </div>
      )}
    </Card>
  )
}
