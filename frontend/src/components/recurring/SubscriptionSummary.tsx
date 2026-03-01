/**
 * SubscriptionSummary - Shows active subscriptions grouped by category with monthly/yearly totals
 */
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { fetchRecurringTransactions, type RecurringTransaction, type FrequencyType } from '@/services/recurring-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { CreditCard } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Normalize any frequency to monthly amount */
function toMonthly(amount: number, frequency: FrequencyType): number {
  switch (frequency) {
    case 'daily': return amount * 30
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly': return amount
    case 'yearly': return amount / 12
    default: return amount
  }
}

const FREQ_KEYS: Record<string, string> = {
  daily: 'recurring.daily',
  weekly: 'recurring.weekly',
  biweekly: 'recurring.biweekly',
  monthly: 'recurring.monthly',
  yearly: 'recurring.yearly',
}

export function SubscriptionSummary() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const { data: recurring, isLoading } = useQuery({
    queryKey: ['recurring-transactions', true],
    queryFn: () => fetchRecurringTransactions(true),
    staleTime: 5 * 60 * 1000,
  })

  const fmt = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  // Filter to expense-only subscriptions (not income, not transfer)
  const subscriptions = (recurring || []).filter(
    (r: RecurringTransaction) => !r.is_income && !r.is_transfer
  )

  const monthlyTotal = subscriptions.reduce(
    (sum, r) => sum + toMonthly(r.amount, r.frequency), 0
  )

  // Group by category
  const grouped = subscriptions.reduce<Record<string, RecurringTransaction[]>>((acc, r) => {
    const cat = r.category || t('subscriptions.uncategorized', 'Other')
    ;(acc[cat] ||= []).push(r)
    return acc
  }, {})

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
  }

  if (subscriptions.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500 dark:text-gray-400">
        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{t('subscriptions.empty', 'No active subscriptions')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Totals card */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('subscriptions.title', 'Subscriptions')}
          </h3>
        </div>
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-numbers">
              {fmt(monthlyTotal)}<span className="text-sm font-normal text-gray-500">/{t('subscriptions.mo', 'mo')}</span>
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {fmt(monthlyTotal * 12)}<span>/{t('subscriptions.yr', 'yr')}</span>
          </div>
        </div>
      </Card>

      {/* Grouped list */}
      {Object.entries(grouped).map(([category, items]) => {
        const catMonthly = items.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
        return (
          <Card key={category} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{category}</h4>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 font-numbers">
                {fmt(catMonthly)}/{t('subscriptions.mo', 'mo')}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {sub.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'px-1.5 py-0.5 text-[10px] font-medium rounded-full',
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      )}>
                        {t(FREQ_KEYS[sub.frequency] || 'recurring.monthly', sub.frequency)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {t('subscriptions.next', 'Next')}: {formatDate(sub.next_run_date, 'MM/dd')}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-numbers shrink-0 ml-3">
                    {fmt(toMonthly(sub.amount, sub.frequency))}/{t('subscriptions.mo', 'mo')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
