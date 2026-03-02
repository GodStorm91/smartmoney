/**
 * RecurringTransactionsList - Display and manage recurring transactions
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { RefreshCw, Trash2, Play, Pause, Calendar } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getLocaleTag } from '@/utils/formatDate'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { convertToJpy } from '@/utils/netWorthCalc'
import {
  fetchRecurringTransactions,
  deleteRecurringTransaction,
  updateRecurringTransaction,
  type RecurringTransaction,
} from '@/services/recurring-service'

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
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const rates = exchangeRates?.rates || {}

  /** Format in native currency (isNativeCurrency=true) */
  const fmtNative = (amount: number, txCurrency: string = 'JPY') =>
    formatCurrencyPrivacy(amount, txCurrency, rates, true, isPrivacyMode)

  /** Format in display currency (isNativeCurrency=false, converts from JPY base) */
  const fmtDisplay = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, rates, false, isPrivacyMode)

  /** Check if a transaction's currency differs from display currency */
  const needsConversion = (txCurrency: string) =>
    txCurrency !== 'JPY' && currency === 'JPY' || txCurrency !== currency

  const { data: recurring, isLoading, isError } = useQuery({
    queryKey: ['recurring-transactions'],
    queryFn: () => fetchRecurringTransactions(),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      setDeletingId(null)
      toast.success(t('recurring.deleted', 'Recurring transaction deleted'))
    },
    onError: () => {
      setDeletingId(null)
      toast.error(t('recurring.deleteFailed', 'Failed to delete. Please try again.'))
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateRecurringTransaction(id, { is_active }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      toast.success(variables.is_active
        ? t('recurring.activated', 'Recurring transaction activated')
        : t('recurring.paused', 'Recurring transaction paused'))
    },
    onError: () => {
      toast.error(t('recurring.updateFailed', 'Failed to update. Please try again.'))
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
      case 'weekly': {
        const dayKey = DAY_KEYS[item.day_of_week ?? 0]
        return `${t('recurring.weekly')} - ${t(dayKey)}`
      }
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

  if (isError) {
    return (
      <Card>
        <EmptyState
          compact
          icon={<RefreshCw />}
          title={t('error.loadFailed', 'Failed to load')}
          description={t('error.tryAgain', 'Something went wrong. Please try again.')}
        />
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
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">
                      {item.description}
                    </h4>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full shrink-0',
                        item.is_active
                          ? 'bg-income-100 text-income-800 dark:bg-income-900/30 dark:text-income-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      {item.is_active ? t('recurring.active') : t('recurring.inactive')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className={cn(
                      'font-numbers',
                      item.is_income ? 'text-income-600 dark:text-income-300' : 'text-expense-600 dark:text-expense-300'
                    )}>
                      {item.is_income ? '+' : '-'}{fmtNative(Math.abs(item.amount), item.currency || 'JPY')}
                      {needsConversion(item.currency || 'JPY') && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                          ({fmtDisplay(convertToJpy(Math.abs(item.amount), item.currency || 'JPY', rates))})
                        </span>
                      )}
                    </span>
                    <span className="truncate max-w-[120px]">{item.category}</span>
                    <span className="truncate">{formatFrequency(item)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar className="w-3 h-3 shrink-0" />
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
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <button
                    onClick={() => handleToggleActive(item)}
                    disabled={toggleActiveMutation.isPending}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      item.is_active
                        ? 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600'
                        : 'hover:bg-income-100 dark:hover:bg-income-900/30 text-income-600'
                    )}
                    aria-label={item.is_active
                      ? t('recurring.pauseAria', 'Pause recurring transaction')
                      : t('recurring.activateAria', 'Activate recurring transaction')}
                  >
                    {item.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 rounded-lg hover:bg-expense-100 dark:hover:bg-expense-900/30 text-expense-600 transition-colors"
                    aria-label={t('recurring.deleteAria', 'Delete recurring transaction')}
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
