import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ArrowUpDown, Calendar, DollarSign, User } from 'lucide-react'
import { getOutstandingReceivables, type OutstandingClient } from '@/services/proxy-service'
import { ProxySettlementModal } from './ProxySettlementModal'
import { cn } from '@/utils/cn'

type SortKey = 'oldest' | 'amount' | 'name'

export function ProxyOutstandingTab() {
  const { t } = useTranslation('common')
  const [settlingClient, setSettlingClient] = useState<OutstandingClient | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('oldest')

  const { data: outstanding = [], isLoading } = useQuery({
    queryKey: ['proxy-outstanding'],
    queryFn: getOutstandingReceivables,
  })

  // Calculate total
  const totalJpy = outstanding.reduce((sum, c) => sum + c.total_jpy, 0)
  const totalVnd = outstanding.reduce((sum, c) => sum + c.total_vnd, 0)

  // Calculate days since oldest
  const getDaysAgo = (dateStr: string | null): number => {
    if (!dateStr) return 0
    const date = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Sort clients
  const sortedClients = [...outstanding].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return getDaysAgo(b.oldest_date) - getDaysAgo(a.oldest_date)
      case 'amount':
        return b.total_jpy - a.total_jpy
      case 'name':
        return a.client_name.localeCompare(b.client_name)
      default:
        return 0
    }
  })

  const sortOptions = [
    { key: 'oldest' as SortKey, icon: Calendar, label: t('proxy.sort.oldest', 'Oldest First') },
    { key: 'amount' as SortKey, icon: DollarSign, label: t('proxy.sort.amount', 'Amount') },
    { key: 'name' as SortKey, icon: User, label: t('proxy.sort.name', 'Name') },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    )
  }

  if (outstanding.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <DollarSign className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('proxy.noOutstanding', 'No Outstanding Receivables')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('proxy.noOutstandingDesc', 'All client payments have been settled.')}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpDown className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1">
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors',
                sortBy === opt.key
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              <opt.icon className="w-3 h-3" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {sortedClients.map(client => {
          const daysAgo = getDaysAgo(client.oldest_date)
          const isOverdue = daysAgo > 30
          return (
            <button
              key={client.client_id}
              onClick={() => setSettlingClient(client)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-lg transition-colors text-left',
                isOverdue
                  ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {client.client_name}
                  </p>
                  {isOverdue && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded">
                      {t('proxy.overdue', 'Overdue')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {client.item_count} {t('proxy.items', 'items')}
                  {daysAgo > 0 && (
                    <span className={cn('ml-2', isOverdue && 'text-red-500 dark:text-red-400')}>
                      • {t('proxy.oldestDays', { days: daysAgo })}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    ¥{client.total_jpy.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ₫{client.total_vnd.toLocaleString()}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Total summary */}
      <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {t('proxy.totalOutstanding', 'Total Outstanding')}
          </span>
          <div className="text-right">
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              ¥{totalJpy.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ₫{totalVnd.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Settlement Modal */}
      <ProxySettlementModal
        isOpen={!!settlingClient}
        onClose={() => setSettlingClient(null)}
        client={settlingClient}
      />
    </>
  )
}
