import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface TransactionTypeToggleProps {
  isIncome: boolean
  onToggle: (isIncome: boolean) => void
}

export function TransactionTypeToggle({ isIncome, onToggle }: TransactionTypeToggleProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={cn(
          'flex-1 py-3 rounded-md text-sm font-medium transition-colors',
          !isIncome ? 'bg-red-500 text-white' : 'text-gray-600 dark:text-gray-300'
        )}
      >
        {t('transaction.expense', 'Expense')}
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={cn(
          'flex-1 py-3 rounded-md text-sm font-medium transition-colors',
          isIncome ? 'bg-green-500 text-white' : 'text-gray-600 dark:text-gray-300'
        )}
      >
        {t('transaction.income', 'Income')}
      </button>
    </div>
  )
}
