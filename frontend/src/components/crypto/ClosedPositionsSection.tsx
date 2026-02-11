/**
 * ClosedPositionsSection - Display closed LP positions with P&L summary
 * Collapsible section showing historical closed positions
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Archive, TrendingUp, TrendingDown } from 'lucide-react'
import { getClosedPositions } from '@/services/position-closure-service'
import { formatCurrency } from '@/utils/formatCurrency'
import { getLocaleTag } from '@/utils/formatDate'
import { CHAIN_INFO, ChainId } from '@/types/crypto'

export function ClosedPositionsSection() {
  const { t } = useTranslation('common')
  const [isExpanded, setIsExpanded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['closed-positions'],
    queryFn: getClosedPositions,
  })

  // Don't render if loading or no closed positions
  if (isLoading || !data || data.total_closed === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-gray-500" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {t('crypto.closedPositions', 'Closed Positions')}
            </h3>
            <p className="text-sm text-gray-500">
              {data.total_closed} {t('crypto.positions', 'positions')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Total P&L */}
          {data.total_realized_pnl_jpy !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-500">{t('crypto.totalPnl', 'Total P&L')}</p>
              <p className={`font-medium ${
                data.total_realized_pnl_jpy >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.total_realized_pnl_jpy >= 0 ? '+' : ''}
                {formatCurrency(data.total_realized_pnl_jpy, 'JPY')}
              </p>
            </div>
          )}
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          {data.positions.map((closure) => {
            const chainInfo = CHAIN_INFO[closure.chain_id as ChainId]
            const isProfitable = closure.realized_pnl_jpy !== null && closure.realized_pnl_jpy >= 0

            return (
              <div
                key={closure.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {closure.protocol} - {closure.symbol}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {chainInfo && <span>{chainInfo.icon}</span>}
                    <span>{new Date(closure.exit_date).toLocaleDateString(getLocaleTag())}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(closure.exit_value_jpy, 'JPY')}
                  </p>
                  {closure.realized_pnl_jpy !== null && (
                    <div className={`flex items-center justify-end gap-1 text-sm ${
                      isProfitable ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isProfitable ? '+' : ''}{formatCurrency(closure.realized_pnl_jpy, 'JPY')}
                      {closure.realized_pnl_pct !== null && (
                        <span className="text-xs">({closure.realized_pnl_pct.toFixed(1)}%)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
