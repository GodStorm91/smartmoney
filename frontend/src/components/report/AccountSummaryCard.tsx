import { useTranslation } from 'react-i18next'
import type { AccountSummaryItem } from '@/types'
import { formatCurrency } from '@/utils/formatCurrency'

interface AccountSummaryCardProps {
  accounts: AccountSummaryItem[]
  totalNetWorth: number
}

export function AccountSummaryCard({ accounts, totalNetWorth }: AccountSummaryCardProps) {
  const { t } = useTranslation('common')

  return (
    <div>
      {/* Net worth highlight */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('report.totalNetWorth')}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(totalNetWorth)}
        </div>
      </div>

      {/* Account list */}
      <div className="space-y-2">
        {accounts.map((acc) => (
          <div
            key={acc.account_id}
            className="flex justify-between items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div>
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {acc.account_name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {acc.account_type}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {formatCurrency(acc.balance, acc.currency, undefined, true)}
              </div>
              {acc.currency !== 'JPY' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{acc.currency}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
