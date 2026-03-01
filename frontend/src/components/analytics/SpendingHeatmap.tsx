/**
 * SpendingHeatmap — day-of-week spending heatmap card.
 *
 * Sub-modules:
 *   heatmap-utils      : tier calculation, week-grid construction
 *   HeatmapGrid        : CSS-grid cell matrix
 *   HeatmapLegend      : colour-scale legend strip
 *   HeatmapDowAverages : day-of-week average mini-bars
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LayoutGrid } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchDailySpending } from '@/services/analytics-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import { buildWeekGrid } from './heatmap-utils'
import { HeatmapGrid } from './HeatmapGrid'
import { HeatmapLegend } from './HeatmapLegend'
import { HeatmapDowAverages } from './HeatmapDowAverages'
import type { DailySpendingEntry, DateRange } from '@/types'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface Props {
  startDate?: string
  endDate?: string
}

interface TooltipState {
  date: string
  amount: number
  x: number
  y: number
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function SpendingHeatmap({ startDate, endDate }: Props) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const dateRange: DateRange | undefined =
    startDate && endDate ? { start: startDate, end: endDate } : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['daily-spending', startDate, endDate],
    queryFn: () => fetchDailySpending(dateRange),
    staleTime: 5 * 60 * 1000,
  })

  const entries = data?.daily_data ?? []
  const dowAvg = data?.day_of_week_avg ?? {}
  const weeks = buildWeekGrid(entries)
  const maxAmount = entries.reduce((m, e) => Math.max(m, e.amount), 0)
  const rates = exchangeRates?.rates ?? {}

  function handleCellEnter(entry: DailySpendingEntry, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ date: entry.date, amount: entry.amount, x: rect.left, y: rect.top })
  }

  // ---- Loading state ----
  if (isLoading) {
    return (
      <Card>
        <CardHeader t={t} />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    )
  }

  // ---- Empty state ----
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader t={t} />
        <p className="text-sm text-center text-gray-400 py-8">{t('heatmap.noData')}</p>
      </Card>
    )
  }

  // ---- Populated state ----
  return (
    <Card>
      <CardHeader t={t} />

      <HeatmapGrid
        weeks={weeks}
        maxAmount={maxAmount}
        onCellEnter={handleCellEnter}
        onCellLeave={() => setTooltip(null)}
      />

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center">
          <HeatmapLegend />
        </div>
        <HeatmapDowAverages dowAvg={dowAvg} />
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className={cn(
            'fixed z-50 pointer-events-none',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600',
            'rounded-lg shadow-lg px-3 py-2 text-xs'
          )}
          style={{ top: tooltip.y - 64, left: tooltip.x + 8 }}
        >
          <p className="font-semibold text-gray-800 dark:text-gray-100">{tooltip.date}</p>
          <p className="text-expense-600 dark:text-expense-400">
            {formatCurrencyPrivacy(tooltip.amount, currency, rates, true, false)}
          </p>
        </div>
      )}
    </Card>
  )
}

// --------------------------------------------------------------------------
// Internal: card header (DRY across loading / empty / populated states)
// --------------------------------------------------------------------------

function CardHeader({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="p-1.5 rounded-xl bg-expense-100 dark:bg-expense-900/30">
        <LayoutGrid className="w-4 h-4 text-expense-600 dark:text-expense-400" />
      </div>
      <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
        {t('heatmap.title')}
      </h3>
    </div>
  )
}
