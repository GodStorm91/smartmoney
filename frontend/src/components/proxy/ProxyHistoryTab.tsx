import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Package, CheckCircle, Clock, Filter } from 'lucide-react'
import { fetchTransactions } from '@/services/transaction-service'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatDate'

type StatusFilter = 'all' | 'outstanding' | 'settled'

interface ProxyTransaction {
  id: number
  date: string
  description: string
  amount: number
  transfer_type: string
  notes?: string
  category?: string
}

export function ProxyHistoryTab() {
  const { t } = useTranslation('common')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  })

  // Filter proxy-related transactions
  const proxyTransactions = allTransactions.filter((tx: ProxyTransaction) =>
    tx.transfer_type?.startsWith('proxy_') ||
    tx.category === 'Proxy Purchase' ||
    tx.category === 'Proxy Income'
  )

  // Parse charge info from notes to get item details
  const parseChargeInfo = (notes?: string) => {
    if (!notes) return null
    try {
      const match = notes.match(/Charge Info: ({.*})/)
      if (match) {
        return JSON.parse(match[1])
      }
    } catch {
      return null
    }
    return null
  }

  // Group transactions by item (expense + receivable pairs)
  const getTransactionStatus = (tx: ProxyTransaction): 'outstanding' | 'settled' => {
    if (tx.transfer_type === 'proxy_settled' || tx.transfer_type === 'proxy_income') {
      return 'settled'
    }
    return 'outstanding'
  }

  // Apply filter
  const filteredTransactions = proxyTransactions.filter((tx: ProxyTransaction) => {
    if (statusFilter === 'all') return true
    return getTransactionStatus(tx) === statusFilter
  })

  // Sort by date descending
  const sortedTransactions = [...filteredTransactions].sort(
    (a: ProxyTransaction, b: ProxyTransaction) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const filterOptions = [
    { key: 'all' as StatusFilter, label: t('proxy.filter.all', 'All') },
    { key: 'outstanding' as StatusFilter, label: t('proxy.filter.outstanding', 'Outstanding') },
    { key: 'settled' as StatusFilter, label: t('proxy.filter.settled', 'Settled') },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    )
  }

  if (proxyTransactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('proxy.noHistory', 'No Purchase History')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('proxy.noHistoryDesc', 'Your proxy purchase history will appear here.')}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Filter controls */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1">
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              className={cn(
                'px-3 py-1 text-xs rounded-full transition-colors',
                statusFilter === opt.key
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {sortedTransactions.map((tx: ProxyTransaction) => {
          const chargeInfo = parseChargeInfo(tx.notes)
          const status = getTransactionStatus(tx)
          const isSettled = status === 'settled'

          return (
            <div
              key={tx.id}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {chargeInfo?.item || tx.description}
                    </p>
                    <span className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 text-xs rounded',
                      isSettled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    )}>
                      {isSettled ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          {t('proxy.settled', 'Settled')}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          {t('proxy.pending', 'Pending')}
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDate(tx.date, 'MMM dd, yyyy')}
                    {chargeInfo?.client_name && (
                      <span className="ml-2">• {chargeInfo.client_name}</span>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {chargeInfo ? (
                    <>
                      <p className="font-mono text-sm text-gray-900 dark:text-white">
                        ¥{chargeInfo.cost?.toLocaleString() || Math.abs(tx.amount).toLocaleString()}
                      </p>
                      {chargeInfo.markup_price && chargeInfo.markup_price !== chargeInfo.cost && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          → ¥{chargeInfo.markup_price.toLocaleString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      ¥{Math.abs(tx.amount).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('proxy.showingCount', {
          count: sortedTransactions.length,
          total: proxyTransactions.length,
          defaultValue: 'Showing {{count}} of {{total}} transactions'
        })}
      </div>
    </>
  )
}
