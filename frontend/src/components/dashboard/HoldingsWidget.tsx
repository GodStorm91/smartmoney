import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, BarChart3, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fetchHoldings, fetchPortfolioSummary } from '@/services/holding-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

const ASSET_ICONS: Record<string, string> = {
  commodity: '🥇',
  stock: '📈',
  etf: '📊',
  bond: '🏦',
  crypto: '₿',
  other: '💼',
}

export function HoldingsWidget() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const { data: holdings } = useQuery({
    queryKey: ['holdings', true],
    queryFn: () => fetchHoldings(true),
    staleTime: 5 * 60 * 1000,
  })

  const { data: summary } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: fetchPortfolioSummary,
    staleTime: 5 * 60 * 1000,
  })

  const fmt = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  // Don't render if no holdings
  if (!holdings || holdings.length === 0) return null

  const pnl = summary?.total_pnl ?? 0
  const pnlPct = summary?.pnl_percentage ?? 0
  const isPositive = pnl >= 0

  // Top 4 holdings by value
  const topHoldings = [...holdings]
    .filter((h) => h.current_value != null)
    .sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0))
    .slice(0, 4)

  return (
    <Card className="p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('holdings.title', 'Investments')}
          </h3>
        </div>
        <Link
          to="/investments"
          className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          {t('viewAll', 'View all')} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
        {/* Total Value */}
        <div className="p-2.5 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('holdings.totalValue', 'Total Value')}
          </p>
          <p className="text-xl sm:text-[1.65rem] font-bold font-numbers text-gray-900 dark:text-gray-100 tracking-tight leading-none">
            {fmt(summary?.total_value ?? 0)}
          </p>
        </div>

        {/* P&L */}
        <div className={cn(
          'p-2.5 sm:p-3 rounded-lg',
          isPositive
            ? 'bg-income-50 dark:bg-income-900/20'
            : 'bg-expense-50 dark:bg-expense-900/20'
        )}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('holdings.pnl', 'P&L')}
          </p>
          <p className={cn(
            'text-xl sm:text-[1.65rem] font-bold font-numbers tracking-tight leading-none',
            isPositive
              ? 'text-income-600 dark:text-income-300'
              : 'text-expense-600 dark:text-expense-300'
          )}>
            {isPositive ? '+' : ''}{fmt(pnl)}
          </p>
          <div className={cn(
            'flex items-center gap-1 mt-1.5 text-xs font-bold font-numbers',
            isPositive
              ? 'text-income-600 dark:text-income-300'
              : 'text-expense-600 dark:text-expense-300'
          )}>
            {isPositive
              ? <TrendingUp className="w-3.5 h-3.5" />
              : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isPositive ? '+' : ''}{pnlPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Top Holdings List */}
      <div className="space-y-1">
        {topHoldings.map((h) => {
          const hPnl = h.unrealized_pnl ?? 0
          const hPositive = hPnl >= 0
          return (
            <div
              key={h.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{ASSET_ICONS[h.asset_type] || '💼'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {h.asset_name}
                  </p>
                  {h.ticker && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-numbers">
                      {h.ticker}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-numbers">
                  {fmt(h.current_value ?? 0)}
                </p>
                <p className={cn(
                  'text-[11px] font-bold font-numbers',
                  hPositive
                    ? 'text-income-600 dark:text-income-300'
                    : 'text-expense-600 dark:text-expense-300'
                )}>
                  {hPositive ? '+' : ''}{(h.pnl_percentage ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
