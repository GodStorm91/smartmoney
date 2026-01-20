import { useTranslation } from 'react-i18next'
import { X, Calendar, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { Transaction } from '@/types'

interface DayTransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  transactions: Transaction[]
}

export function DayTransactionsModal({ isOpen, onClose, date, transactions }: DayTransactionsModalProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()

  if (!isOpen) return null

  // Calculate total spending in JPY for display
  const totalSpending = transactions.reduce((sum, tx) => {
    if (tx.type === 'income') return sum
    const txCurrency = tx.currency || 'JPY'
    const rateToJpy = rates[txCurrency] || 1
    const amountInJpy = Math.abs(tx.amount) / rateToJpy
    return sum + amountInJpy
  }, 0)

  const formatCurrency = (amount: number, currencyCode?: string) => {
    // Display the original amount in its native currency without conversion
    const targetCurrency = currencyCode || currency
    return formatCurrencyPrivacy(amount, targetCurrency, rates, true, isPrivacyMode)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 animate-in fade-in"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[85dvh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {format(date, 'yyyy年M月d日', { locale: ja })}
                </h3>
                <p className="text-xs text-gray-500">
                  {transactions.length} {t('transactions.count', 'transactions')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Total Spending */}
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  {t('spendingCalendar.totalSpending', 'Total Spending')}
                </span>
              </div>
                <span className="text-lg font-bold text-red-700 dark:text-red-300 font-numbers">
                -{formatCurrency(totalSpending, 'JPY')}
              </span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                    tx.type === 'income' 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tx.description || tx.category}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.source}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'text-sm font-semibold font-numbers',
                  tx.type === 'income' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-900 dark:text-gray-100'
                )}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), tx.currency || 'JPY')}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shrink-0">
            <Button onClick={onClose} className="w-full">
              {t('close')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default DayTransactionsModal
