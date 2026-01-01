import type { AccountWithBalance, AccountType } from '@/types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Card } from '@/components/ui/Card'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'

interface AccountCardProps {
  account: AccountWithBalance
  onEdit?: (accountId: number) => void
  onDelete?: (accountId: number) => void
}

// Account type icons and colors
const ACCOUNT_TYPE_CONFIG: Record<
  AccountType,
  { icon: string; color: string; bgColor: string }
> = {
  bank: { icon: '🏦', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  cash: { icon: '💵', color: 'text-green-600', bgColor: 'bg-green-50' },
  credit_card: { icon: '💳', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  investment: { icon: '📈', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  receivable: { icon: '💰', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  other: { icon: '📁', color: 'text-gray-600', bgColor: 'bg-gray-50' },
}

export function AccountCard({ account, onEdit }: AccountCardProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()

  const typeConfig = ACCOUNT_TYPE_CONFIG[account.type]
  const balancePositive = account.current_balance >= 0

  // Navigate to transactions page filtered by this account
  const handleCardClick = () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    navigate({
      to: '/transactions',
      search: { accountId: account.id, month, fromAccounts: true }
    })
  }

  return (
    <Card
      className="relative hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-lg', typeConfig.bgColor)}>
            <span className="text-2xl">{typeConfig.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{account.name}</h3>
            <p className={cn('text-sm', typeConfig.color)}>
              {t(`account.type.${account.type}`)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(account.id) }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('account.edit')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          )}
          {!account.is_active && (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              {t('account.inactive')}
            </span>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('account.currentBalance')}</p>
        <p
          className={cn(
            'text-3xl font-bold font-mono',
            balancePositive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {formatCurrencyPrivacy(account.current_balance, account.currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('account.initialBalance')}</p>
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
            {formatCurrencyPrivacy(account.initial_balance, account.currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('account.transactions')}</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {account.transaction_count}
          </p>
        </div>
      </div>

      {/* Notes (if present) */}
      {account.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('account.notes')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{account.notes}</p>
        </div>
      )}
    </Card>
  )
}
