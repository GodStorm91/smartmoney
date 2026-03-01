/**
 * Helpers for YoYComparisonChart:
 *   - Bar color constants
 *   - formatCompact utility
 *   - YoYSummaryRow sub-component
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import type { YoYResponse } from '@/services/analytics-service'

export type YoYViewMode = 'expenses' | 'income'

// Semantic bar colors — lighter shade = previous year, darker = current year
export const EXPENSE_PREV_COLOR = '#fca5a5' // rose-300
export const EXPENSE_CURR_COLOR = '#dc2626' // rose-600 (expense-600)
export const INCOME_PREV_COLOR  = '#86efac' // green-300
export const INCOME_CURR_COLOR  = '#16a34a' // green-600 (income-600)

/** Theme-aware chart colors using standard Tailwind gray palette. */
export function getChartThemeColors(isDark: boolean) {
  return {
    grid:    isDark ? '#374151' : '#E5E7EB',  // gray-700 / gray-200
    axis:    isDark ? '#9CA3AF' : '#6B7280',  // gray-400 / gray-500
    tooltip: isDark ? '#1F2937' : '#FFFFFF',  // gray-800 / white
    border:  isDark ? '#374151' : '#E5E7EB',  // gray-700 / gray-200
    legend:  isDark ? '#D1D5DB' : '#374151',  // gray-300 / gray-700
  }
}

/** Compact axis-tick formatter, locale-aware (matches existing chart pattern). */
export function formatCompact(value: number, currency: string, lang: string): string {
  if (value === 0) return ''
  const abs = Math.abs(value)

  if (currency === 'VND') {
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000)     return `${(value / 1_000).toFixed(0)}K`
    return value.toString()
  }

  if (currency === 'JPY') {
    if (abs >= 10_000) {
      const unit = lang === 'ja' ? '万' : 'W'
      return `${(value / 10_000).toFixed(1)}${unit}`
    }
    if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`
    return value.toString()
  }

  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(value / 1_000).toFixed(0)}K`
  return value.toString()
}

/** Expense/Income toggle pills for the YoY chart header. */
export function YoYViewToggle({
  viewMode,
  setViewMode,
  t,
}: {
  viewMode: YoYViewMode
  setViewMode: (m: YoYViewMode) => void
  t: (key: string) => string
}) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-1 inline-flex self-start sm:self-auto">
      <button
        onClick={() => setViewMode('expenses')}
        className={cn(
          'px-4 py-1.5 text-xs font-semibold rounded-full transition-colors',
          viewMode === 'expenses'
            ? 'bg-expense-600 text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        )}
      >
        {t('yoy.expenses')}
      </button>
      <button
        onClick={() => setViewMode('income')}
        className={cn(
          'px-4 py-1.5 text-xs font-semibold rounded-full transition-colors',
          viewMode === 'income'
            ? 'bg-income-600 text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        )}
      >
        {t('yoy.income')}
      </button>
    </div>
  )
}

interface YoYSummaryRowProps {
  data: YoYResponse
  mode: YoYViewMode
  currency: string
  rates: Record<string, number>
  isPrivacyMode: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}

/** Summary bar rendered below the chart: total + YoY change badge. */
export function YoYSummaryRow({ data, mode, currency, rates, isPrivacyMode, t }: YoYSummaryRowProps) {
  const { summary, current_year, previous_year } = data

  const currentTotal = mode === 'expenses'
    ? summary.total_current_expense
    : summary.total_current_income
  const changePct = mode === 'expenses'
    ? summary.total_expense_change_pct
    : summary.total_income_change_pct

  const formattedTotal = formatCurrencyPrivacy(currentTotal, currency, rates, false, isPrivacyMode)
  const isIncrease = changePct !== null && changePct > 0
  const isDecrease = changePct !== null && changePct < 0

  // Good/bad semantics: expense increase = bad (red), expense decrease = good (green); income is inverse
  const badgeClass = cn(
    'inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full',
    isIncrease && mode === 'expenses'
      ? 'bg-expense-50 dark:bg-expense-900/20 text-expense-700 dark:text-expense-400'
      : isDecrease && mode === 'expenses'
      ? 'bg-income-50 dark:bg-income-900/20 text-income-700 dark:text-income-400'
      : isIncrease && mode === 'income'
      ? 'bg-income-50 dark:bg-income-900/20 text-income-700 dark:text-income-400'
      : isDecrease && mode === 'income'
      ? 'bg-expense-50 dark:bg-expense-900/20 text-expense-700 dark:text-expense-400'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  )

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {mode === 'expenses' ? t('yoy.expenses') : t('yoy.income')}{' '}
        {current_year}:{' '}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formattedTotal}
        </span>
      </p>
      {changePct !== null && (
        <div className={badgeClass}>
          {isIncrease ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : isDecrease ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          {t('yoy.change', {
            percent: `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}`,
          })}{' '}
          {previous_year}
        </div>
      )}
    </div>
  )
}
