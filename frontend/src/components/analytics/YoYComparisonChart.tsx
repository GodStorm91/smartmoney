import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { CalendarRange } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchYearOverYear } from '@/services/analytics-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  type YoYViewMode,
  EXPENSE_PREV_COLOR,
  EXPENSE_CURR_COLOR,
  INCOME_PREV_COLOR,
  INCOME_CURR_COLOR,
  getChartThemeColors,
  formatCompact,
  YoYViewToggle,
  YoYSummaryRow,
} from './yoy-comparison-helpers'

export function YoYComparisonChart() {
  const { t, i18n } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const { resolvedTheme } = useTheme()
  const [viewMode, setViewMode] = useState<YoYViewMode>('expenses')

  const isDark = resolvedTheme === 'dark'
  const lang = i18n.language

  const theme = getChartThemeColors(isDark)

  const rates = exchangeRates?.rates || {}

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-yoy'],
    queryFn: fetchYearOverYear,
    staleTime: 10 * 60 * 1000,
  })

  const prevColor = viewMode === 'expenses' ? EXPENSE_PREV_COLOR : INCOME_PREV_COLOR
  const currColor = viewMode === 'expenses' ? EXPENSE_CURR_COLOR : INCOME_CURR_COLOR

  // null values = future months; Recharts renders them as gaps (no bar)
  const chartData = data?.months.map((m) => ({
    label:     m.label,
    previous:  viewMode === 'expenses' ? m.previous_expense : m.previous_income,
    current:   viewMode === 'expenses' ? m.current_expense  : m.current_income,
    changePct: viewMode === 'expenses' ? m.expense_change_pct : m.income_change_pct,
  })) ?? []

  const hasData =
    chartData.some((d) => (d.previous ?? 0) > 0) ||
    chartData.some((d) => (d.current  ?? 0) > 0)

  return (
    <Card>
      {/* Header + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-net-100 dark:bg-net-900/30">
            <CalendarRange className="w-4 h-4 text-net-600 dark:text-net-400" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('yoy.title')}
          </h3>
        </div>
        <YoYViewToggle viewMode={viewMode} setViewMode={setViewMode} t={t} />
      </div>

      {/* Body */}
      {isLoading ? (
        <div>
          <Skeleton className="h-64 sm:h-80 w-full rounded-lg" />
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ) : error || !data || !hasData ? (
        <p className="text-center py-8 text-gray-400 text-sm">{t('yoy.noData')}</p>
      ) : (
        <>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 8, bottom: 5 }}
                barCategoryGap="20%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                <XAxis
                  dataKey="label"
                  stroke={theme.axis}
                  style={{ fontSize: '11px', fontFamily: 'Noto Sans JP, sans-serif' }}
                />
                <YAxis
                  stroke={theme.axis}
                  style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
                  tickFormatter={(v) => formatCompact(v, currency, lang)}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.tooltip,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: theme.legend,
                  }}
                  formatter={(value: number | string | (string | number)[], name: string) =>
                    value === null || value === undefined
                      ? ['-', name]
                      : [formatCurrencyPrivacy(Number(value), currency, rates, false, isPrivacyMode), name]
                  }
                  labelFormatter={(label, payload) => {
                    const pct = payload?.[0]?.payload?.changePct
                    if (pct !== null && pct !== undefined) {
                      return `${label}  (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`
                    }
                    return label
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '13px',
                    fontFamily: 'Noto Sans JP, sans-serif',
                    color: theme.legend,
                  }}
                />
                <Bar
                  dataKey="previous"
                  name={String(data.previous_year)}
                  fill={prevColor}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={700}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="current"
                  name={String(data.current_year)}
                  fill={currColor}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationBegin={150}
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <YoYSummaryRow
            data={data}
            mode={viewMode}
            currency={currency}
            rates={rates}
            isPrivacyMode={isPrivacyMode}
            t={t as (key: string, opts?: Record<string, unknown>) => string}
          />
        </>
      )}
    </Card>
  )
}
