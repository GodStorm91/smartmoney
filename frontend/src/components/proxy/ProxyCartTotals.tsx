import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { CartItem } from './ProxyCartItemRow'

interface ProxyCartTotalsProps {
  items: CartItem[]
  exchangeRate: number
}

// Parse formatted number
function parseNumber(value: string): number {
  return parseInt(value.replace(/[,.\s]/g, ''), 10) || 0
}

export function ProxyCartTotals({ items, exchangeRate }: ProxyCartTotalsProps) {
  const { t } = useTranslation('common')

  const totals = useMemo(() => {
    const validItems = items.filter(i => i.item.trim() || parseNumber(i.cost) > 0)
    const totalCost = items.reduce((sum, i) => sum + parseNumber(i.cost), 0)
    const totalMarkup = items.reduce((sum, i) => {
      const markup = parseNumber(i.markupPrice)
      const cost = parseNumber(i.cost)
      return sum + (markup || cost) // Use cost if no markup set
    }, 0)
    const profitJpy = totalMarkup - totalCost
    const clientPaysVnd = totalMarkup * exchangeRate
    const marginPct = totalCost > 0 ? (profitJpy / totalCost) * 100 : 0

    return {
      itemCount: validItems.length,
      totalCost,
      totalMarkup,
      profitJpy,
      clientPaysVnd,
      marginPct,
    }
  }, [items, exchangeRate])

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">{t('proxy.totalCost', 'Total Cost')}:</span>
          <span className="font-bold ml-2">¥{totals.totalCost.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">{t('proxy.totalMarkup', 'Total Markup')}:</span>
          <span className="font-bold ml-2">¥{totals.totalMarkup.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">{t('proxy.clientPays', 'Client Pays')}:</span>
          <span className="font-bold ml-2">₫{totals.clientPaysVnd.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">{t('proxy.yourProfit', 'Your Profit')}:</span>
          <span className={cn('font-bold ml-2', totals.profitJpy >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            ¥{totals.profitJpy.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Margin indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('proxy.margin', 'Margin')}:</span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              totals.marginPct >= 20 ? 'bg-green-500' : totals.marginPct >= 10 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(100, Math.max(0, totals.marginPct))}%` }}
          />
        </div>
        <span className={cn(
          'text-sm font-medium min-w-[50px] text-right',
          totals.marginPct >= 20 ? 'text-green-600 dark:text-green-400' : totals.marginPct >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
        )}>
          {totals.marginPct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
