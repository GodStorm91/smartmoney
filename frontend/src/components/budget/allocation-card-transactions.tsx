import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { TopTransaction } from './budget-allocation-card'

interface AllocationTransactionsProps {
  transactions: TopTransaction[]
  formatCurrency: (amount: number) => string
}

export function AllocationCardTransactions({ transactions, formatCurrency }: AllocationTransactionsProps) {
  const { t } = useTranslation('common')

  if (transactions.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {t('budget.topSpending')}
      </p>
      <div className="space-y-1.5">
        {transactions.slice(0, 3).map((tx) => (
          <div
            key={tx.id}
            className={cn(
              'flex items-center justify-between text-sm py-1 px-2 rounded',
              tx.isBig && 'bg-red-50 dark:bg-red-900/20'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {tx.isBig && <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
              <span className="truncate text-gray-700 dark:text-gray-300">{tx.description}</span>
            </div>
            <span className={cn(
              'font-medium ml-2 whitespace-nowrap',
              tx.isBig ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
            )}>
              {formatCurrency(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
