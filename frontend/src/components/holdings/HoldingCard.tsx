/**
 * HoldingCard - Displays a single investment holding with P&L info
 */
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import type { Holding } from '@/types/holding'

interface HoldingCardProps {
  holding: Holding
  onClick: () => void
  index?: number
}

/** Check if a date string is more than 7 days ago */
function isPriceStale(dateStr: string | null): boolean {
  if (!dateStr) return false
  const priceDate = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - priceDate.getTime()
  return diffMs > 7 * 24 * 60 * 60 * 1000
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function HoldingCard({ holding, onClick, index = 0 }: HoldingCardProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const rates = exchangeRates?.rates || {}

  const fmt = (amount: number, cur?: string) =>
    formatCurrencyPrivacy(amount, cur || holding.currency, rates, true, isPrivacyMode)

  const fmtDisplay = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, rates, false, isPrivacyMode)

  const units = parseFloat(holding.total_units).toFixed(2)
  const hasPrice = holding.current_price_per_unit != null
  const stale = isPriceStale(holding.current_price_date)
  const pnl = holding.unrealized_pnl ?? 0
  const pnlPct = holding.pnl_percentage ?? 0
  const isPositive = pnl >= 0

  return (
    <Card
      hover
      onClick={onClick}
      className={cn(
        'animate-stagger-in cursor-pointer hover:shadow-md transition-shadow'
      )}
      style={{ '--stagger-index': index } as React.CSSProperties}
    >
      {/* Row 1: Name, type badge, units */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {holding.asset_name}
          </h4>
          <span className={cn(
            'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full shrink-0',
            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          )}>
            {t(`holdings.${holding.asset_type}`, holding.asset_type)}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-numbers shrink-0">
          {units} {holding.unit_label}
        </span>
      </div>

      {/* Row 2: Avg cost & current price */}
      <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-numbers">
          {t('holdings.avgCost', 'Avg')}: {fmt(holding.avg_cost_per_unit)}/{holding.unit_label}
        </span>
        {hasPrice && (
          <span className="font-numbers">
            {t('holdings.currentPrice', 'Now')}: {fmt(holding.current_price_per_unit!)}/{holding.unit_label}
          </span>
        )}
      </div>

      {/* Row 3: Value, P&L, stale warning */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          {hasPrice && holding.current_value != null ? (
            <>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-numbers">
                {t('holdings.totalValue', 'Value')}: {fmtDisplay(holding.current_value)}
              </span>
              <span className={cn(
                'flex items-center gap-1 text-sm font-bold font-numbers',
                isPositive
                  ? 'text-income-600 dark:text-income-300'
                  : 'text-expense-600 dark:text-expense-300'
              )}>
                {t('holdings.pnl', 'P&L')}: {isPositive ? '+' : ''}{fmtDisplay(pnl)}
                {' '}({isPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">
              {t('holdings.noPriceSet', 'No price set')}
            </span>
          )}
        </div>

        {hasPrice && holding.current_price_date && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-numbers shrink-0',
            stale
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-gray-400 dark:text-gray-500'
          )}>
            <span>{t('holdings.currentPrice', 'Price')}: {formatShortDate(holding.current_price_date)}</span>
            {stale && <AlertTriangle className="w-3.5 h-3.5" />}
          </div>
        )}
      </div>
    </Card>
  )
}
