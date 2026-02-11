import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { fetchTransactions } from '@/services/transaction-service'
import { getLocaleTag } from '@/utils/formatDate'
import { cn } from '@/utils/cn'

interface MonthlyProfit {
  month: string
  monthLabel: string
  totalCost: number
  totalMarkup: number
  profit: number
  marginPct: number
  itemCount: number
}

export function ProxyProfitTab() {
  const { t } = useTranslation('common')

  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  })

  // Calculate monthly profit data
  const monthlyData = useMemo(() => {
    const proxyTransactions = allTransactions.filter((tx: any) =>
      tx.transfer_type?.startsWith('proxy_') ||
      tx.category === 'Proxy Purchase' ||
      tx.category === 'Proxy Income'
    )

    // Group by month
    const byMonth: Record<string, { cost: number; markup: number; items: number }> = {}

    proxyTransactions.forEach((tx: any) => {
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { cost: 0, markup: 0, items: 0 }
      }

      // Parse charge info for cost/markup
      let cost = 0
      let markup = 0
      if (tx.notes) {
        try {
          const match = tx.notes.match(/Charge Info: ({.*})/)
          if (match) {
            const info = JSON.parse(match[1])
            cost = info.cost || 0
            markup = info.markup_price || info.cost || 0
          }
        } catch {
          // Fallback to amount
          cost = Math.abs(tx.amount)
          markup = Math.abs(tx.amount)
        }
      }

      if (tx.transfer_type === 'proxy_expense') {
        byMonth[monthKey].cost += cost
        byMonth[monthKey].markup += markup
        byMonth[monthKey].items += 1
      }
    })

    // Convert to array and sort by month
    const months: MonthlyProfit[] = Object.entries(byMonth)
      .map(([month, data]) => {
        const [year, m] = month.split('-')
        const date = new Date(parseInt(year), parseInt(m) - 1)
        const monthLabel = date.toLocaleDateString(getLocaleTag(), { month: 'short', year: 'numeric' })

        return {
          month,
          monthLabel,
          totalCost: data.cost,
          totalMarkup: data.markup,
          profit: data.markup - data.cost,
          marginPct: data.cost > 0 ? ((data.markup - data.cost) / data.cost) * 100 : 0,
          itemCount: data.items,
        }
      })
      .sort((a, b) => b.month.localeCompare(a.month))

    return months
  }, [allTransactions])

  // Calculate totals
  const totals = useMemo(() => {
    const totalCost = monthlyData.reduce((sum, m) => sum + m.totalCost, 0)
    const totalMarkup = monthlyData.reduce((sum, m) => sum + m.totalMarkup, 0)
    const totalProfit = totalMarkup - totalCost
    const totalItems = monthlyData.reduce((sum, m) => sum + m.itemCount, 0)
    const avgMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

    return { totalCost, totalMarkup, totalProfit, totalItems, avgMargin }
  }, [monthlyData])

  // Find max profit for bar scaling
  const maxProfit = Math.max(...monthlyData.map(m => Math.abs(m.profit)), 1)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (monthlyData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('proxy.noProfit', 'No Profit Data')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('proxy.noProfitDesc', 'Start making proxy purchases to see profit analytics.')}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">
            {t('proxy.totalProfit', 'Total Profit')}
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            ¥{totals.totalProfit.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
            {t('proxy.avgMargin', 'Avg Margin')}
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {totals.avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('proxy.totalCost', 'Total Cost')}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            ¥{totals.totalCost.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('proxy.totalItems', 'Total Items')}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {totals.totalItems}
          </p>
        </div>
      </div>

      {/* Monthly breakdown */}
      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        {t('proxy.monthlyBreakdown', 'Monthly Breakdown')}
      </h3>

      <div className="space-y-3">
        {monthlyData.map((month, idx) => {
          const isCurrentMonth = idx === 0
          const barWidth = (Math.abs(month.profit) / maxProfit) * 100

          return (
            <div
              key={month.month}
              className={cn(
                'p-4 rounded-lg',
                isCurrentMonth
                  ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                  : 'bg-gray-50 dark:bg-gray-800'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {month.monthLabel}
                  </span>
                  {isCurrentMonth && (
                    <span className="px-1.5 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded">
                      {t('proxy.currentMonth', 'Current')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {month.profit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn(
                    'font-bold',
                    month.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    ¥{month.profit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Profit bar */}
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    month.profit >= 0 ? 'bg-green-500' : 'bg-red-500'
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Details */}
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {month.itemCount} {t('proxy.items', 'items')} • {t('proxy.margin', 'Margin')}: {month.marginPct.toFixed(1)}%
                </span>
                <span>
                  ¥{month.totalCost.toLocaleString()} → ¥{month.totalMarkup.toLocaleString()}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
