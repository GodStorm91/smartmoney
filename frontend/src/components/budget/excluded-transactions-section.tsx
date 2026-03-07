import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { fetchTransactions } from '@/services/transaction-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { Transaction } from '@/types'

interface ExcludedTransactionsSectionProps {
  month: string
}

export function ExcludedTransactionsSection({ month }: ExcludedTransactionsSectionProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      try {
        const [year, monthNum] = month.split('-').map(Number)
        const lastDay = new Date(year, monthNum, 0).getDate()
        const data = await fetchTransactions({
          start_date: `${year}-${String(monthNum).padStart(2, '0')}-01`,
          end_date: `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        })
        if (mounted) setTransactions(data.filter(tx => tx.exclude_from_budget))
      } catch {
        // silently fail — this is informational
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [month])

  if (isLoading || transactions.length === 0) return null

  const totalExcluded = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  return (
    <div className="animate-fade-in">
      <CollapsibleCard
        title={t('budget.excluded.title')}
        badge={transactions.length}
        defaultOpen={false}
        className="border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
      >
        <div className="space-y-2">
          {transactions.map(tx => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{tx.description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(tx.date)} &middot; {tx.category}
                </p>
              </div>
              <span className="text-sm font-medium font-numbers text-gray-500 dark:text-gray-400 ml-3 flex-shrink-0">
                {formatCurrency(Math.abs(tx.amount))}
              </span>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('budget.excluded.total')}
            </span>
            <span className="text-sm font-semibold font-numbers text-gray-700 dark:text-gray-300">
              {formatCurrency(totalExcluded)}
            </span>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  )
}
