/**
 * RecurringTransactionsList - Display and manage recurring transactions
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, Play, Pause, Calendar } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getLocaleTag } from '@/utils/formatDate'
import {
  fetchRecurringTransactions,
  deleteRecurringTransaction,
  updateRecurringTransaction,
  type RecurringTransaction,
} from '@/services/recurring-service'

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  VND: '₫',
}

const DAY_KEYS = [
  'recurring.days.monday',
  'recurring.days.tuesday',
  'recurring.days.wednesday',
  'recurring.days.thursday',
  'recurring.days.friday',
  'recurring.days.saturday',
  'recurring.days.sunday',
]

export function RecurringTransactionsList() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data: recurring, isLoading } = useQuery({
    queryKey: ['recurring-transactions'],
    queryFn: () => fetchRecurringTransactions(),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      setDeletingId(null)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateRecurringTransaction(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
    },
  })

  const handleDelete = (id: number) => {
    if (confirm(t('confirmDelete', 'Are you sure you want to delete this?'))) {
      setDeletingId(id)
      deleteMutation.mutate(id)
    }
  }

  const handleToggleActive = (item: RecurringTransaction) => {
    toggleActiveMutation.mutate({ id: item.id, is_active: !item.is_active })
  }

  const formatFrequency = (item: RecurringTransaction): string => {
    switch (item.frequency) {
      case 'weekly':
        const dayKey = DAY_KEYS[item.day_of_week ?? 0]
        return `${t('recurring.weekly')} - ${t(dayKey)}`
      case 'monthly':
        return `${t('recurring.monthly')} - ${t('recurring.dayOfMonthValue', { day: item.day_of_month ?? 1 })}`
      case 'yearly':
        return t('recurring.yearly')
      case 'custom':
        return t('recurring.everyNDays', { n: item.interval_days ?? 7 })
      default:
        return item.frequency
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(getLocaleTag())
  }

  if (isLoading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          {t('recurring.title')}
        </h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-6">
        <RefreshCw className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('recurring.title')}
        </h3>
      </div>

      {recurring && recurring.length > 0 ? (
        <div className="space-y-3">
          {recurring.map((item) => (
            <div
              key={item.id}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                item.is_active
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.description}
                    </h4>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        item.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      {item.is_active ? t('recurring.active') : t('recurring.inactive')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-numbers">
                      {item.is_income ? '+' : '-'}
                      {CURRENCY_SYMBOLS['JPY']}{Math.abs(item.amount).toLocaleString()}
                    </span>
                    <span>{item.category}</span>
                    <span>{formatFrequency(item)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {t('recurring.nextRun')}: {formatDate(item.next_run_date)}
                    </span>
                    {item.last_run_date && (
                      <span className="ml-3">
                        {t('recurring.lastRun')}: {formatDate(item.last_run_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleToggleActive(item)}
                    disabled={toggleActiveMutation.isPending}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      item.is_active
                        ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600'
                        : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600'
                    )}
                    title={item.is_active ? t('recurring.inactive') : t('recurring.active')}
                  >
                    {item.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                    title={t('button.delete')}
                  >
                    {deletingId === item.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon={<RefreshCw />}
          title={t('emptyState.recurring.title', 'No recurring transactions')}
          description={t('emptyState.recurring.description', 'Set up automated tracking for regular expenses')}
        />
      )}
    </Card>
  )
}
