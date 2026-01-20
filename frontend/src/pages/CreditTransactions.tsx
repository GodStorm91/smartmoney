import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useCreditTransactions, useCreditBalance } from '@/hooks/useCredits'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { TransactionType } from '@/types/credit'

const TRANSACTION_ICONS: Record<TransactionType, typeof TrendingUp> = {
  purchase: TrendingUp,
  usage: TrendingDown,
  refund: RefreshCw,
  adjustment: DollarSign
}

const TRANSACTION_COLORS: Record<TransactionType, string> = {
  purchase: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  usage: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  refund: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  adjustment: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30'
}

export function CreditTransactions() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [filter, setFilter] = useState<string>('all')

  const { data: balance } = useCreditBalance()
  const { data: history, isLoading } = useCreditTransactions(page, perPage, filter)

  const formatCredits = (amount: number) => {
    const prefix = amount > 0 ? '+' : ''
    return `${prefix}${amount.toFixed(4)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back', 'Back')}
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('credits.transactionHistory', 'Transaction History')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {t('credits.viewAllTransactions', 'View all your credit transactions')}
        </p>
      </div>

      {/* Current Balance Card */}
      {balance && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('credits.currentBalance', 'Current Balance')}</p>
              <p className="text-3xl font-bold text-blue-600">{balance.balance.toFixed(4)}</p>
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('credits.totalPurchased', 'Total Purchased')}</p>
                <p className="text-lg font-semibold text-green-600">{balance.lifetime_purchased.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('credits.totalSpent', 'Total Spent')}</p>
                <p className="text-lg font-semibold text-red-600">{balance.lifetime_spent.toFixed(4)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['all', 'purchase', 'usage', 'refund', 'adjustment'].map((type) => (
          <button
            key={type}
            onClick={() => {
              setFilter(type)
              setPage(1)
            }}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors capitalize',
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            {t(`credits.filter${type.charAt(0).toUpperCase() + type.slice(1)}`, type)}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">{t('loading', 'Loading...')}</p>
          </div>
        ) : !history || history.transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">{t('credits.noTransactions', 'No transactions found')}</p>
            <Button
              onClick={() => navigate({ to: '/register' })}
              className="mt-4"
            >
              {t('credits.purchaseCredits', 'Purchase Credits')}
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 font-semibold text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
              <div className="col-span-3">{t('credits.date', 'Date')}</div>
              <div className="col-span-2">{t('credits.type', 'Type')}</div>
              <div className="col-span-4">{t('credits.description', 'Description')}</div>
              <div className="col-span-2 text-right">{t('credits.amount', 'Amount')}</div>
              <div className="col-span-1 text-right">{t('credits.balance', 'Balance')}</div>
            </div>

            {/* Transaction Rows */}
            {history.transactions.map((transaction) => {
              const Icon = TRANSACTION_ICONS[transaction.type]
              const colorClass = TRANSACTION_COLORS[transaction.type]

              return (
                <div
                  key={transaction.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 items-center"
                >
                  {/* Date */}
                  <div className="col-span-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(transaction.created_at)}
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium', colorClass)}>
                      <Icon className="h-3 w-3" />
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-4 text-sm text-gray-900 dark:text-gray-100">
                    {transaction.description}
                  </div>

                  {/* Amount */}
                  <div className={cn(
                    'col-span-2 text-right font-semibold font-mono',
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCredits(transaction.amount)}
                  </div>

                  {/* Balance After */}
                  <div className="col-span-1 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                    {transaction.balance_after.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {history && history.pages > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('credits.showingResults', 'Showing {{start}} - {{end}} of {{total}}', {
                start: (page - 1) * perPage + 1,
                end: Math.min(page * perPage, history.total),
                total: history.total
              })}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                size="sm"
              >
                {t('previous', 'Previous')}
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, history.pages) }, (_, i) => {
                  let pageNum: number
                  if (history.pages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= history.pages - 2) {
                    pageNum = history.pages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded text-sm font-medium transition-colors',
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <Button
                onClick={() => setPage(p => Math.min(history.pages, p + 1))}
                disabled={page === history.pages}
                variant="outline"
                size="sm"
              >
                {t('next', 'Next')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
