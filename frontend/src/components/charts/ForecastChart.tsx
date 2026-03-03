import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/utils/formatCurrency'
import { getLocaleTag } from '@/utils/formatDate'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import type { ForecastMonth } from '@/types'

interface ForecastChartProps {
  data: ForecastMonth[]
}

// Format month key (YYYY-MM) to short display using locale
function formatMonthLabel(monthKey: string): string {
  const parts = monthKey.split('-')
  if (parts.length < 2) return monthKey
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1)
  const tag = getLocaleTag()
  return date.toLocaleDateString(tag, { month: 'short' })
}

// Format large numbers compactly (locale-aware)
function formatCompact(value: number, currency: string, lang: string): string {
  if (value === 0) return ''
  const absValue = Math.abs(value)

  if (currency === 'VND') {
    if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  if (currency === 'JPY') {
    if (absValue >= 10000) {
      const unit = lang === 'ja' ? '万' : 'W'
      return `${(value / 10000).toFixed(1)}${unit}`
    }
    if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toString()
}

export function ForecastChart({ data }: ForecastChartProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { t, i18n } = useTranslation('common')
  const { resolvedTheme } = useTheme()
  const lang = i18n.language
  const isDark = resolvedTheme === 'dark'

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        {t('forecast.noData', 'No forecast data')}
      </div>
    )
  }

  // Theme colors
  const gridColor = isDark ? '#45475a' : '#E5E7EB'
  const axisColor = isDark ? '#a6adc8' : '#6B7280'
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const tooltipText = isDark ? '#cdd6f4' : '#374151'
  const incomeColor = '#4CAF50'
  const expenseColor = '#F44336'
  const balanceColor = '#2196F3'

  // Transform data: split actual vs projected into separate fields for cleaner rendering
  // This avoids the fragile Cell pattern that can crash
  const chartData = data.map(d => ({
    monthLabel: formatMonthLabel(d.month),
    monthKey: d.month,
    is_actual: d.is_actual,
    income: d.income,
    expense: d.expense,
    balance: d.balance,
    net: d.net,
  }))

  // Find projection start for reference line
  const projectionStartIdx = chartData.findIndex(d => !d.is_actual)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="monthLabel"
          stroke={axisColor}
          tick={{ fontSize: 11, fontFamily: 'DM Mono, monospace' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          stroke={axisColor}
          tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
          tickFormatter={(value) => formatCompact(value, currency, lang)}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={balanceColor}
          tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
          tickFormatter={(value) => formatCompact(value, currency, lang)}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'DM Mono, monospace',
            color: tooltipText,
            padding: '8px 12px',
          }}
          formatter={(value: number, name: string) => [
            formatCurrency(value, currency, exchangeRates?.rates || {}, false),
            name
          ]}
          labelFormatter={(_, payload) => {
            if (payload && payload[0]) {
              const item = payload[0].payload
              const tag = item.is_actual ? t('forecast.actual') : t('forecast.projected')
              return `${item.monthKey} (${tag})`
            }
            return ''
          }}
        />

        {/* Reference line at projection start */}
        {projectionStartIdx > 0 && (
          <ReferenceLine
            yAxisId="left"
            x={chartData[projectionStartIdx]?.monthLabel}
            stroke={isDark ? '#6c7086' : '#9CA3AF'}
            strokeDasharray="5 5"
            label={{
              value: t('forecast.projected'),
              position: 'top',
              fill: axisColor,
              fontSize: 10,
              fontFamily: 'DM Mono, monospace',
            }}
          />
        )}

        {/* Income bars — use fill with opacity for projected */}
        <Bar
          yAxisId="left"
          dataKey="income"
          name={t('chart.income')}
          fill={incomeColor}
          fillOpacity={0.85}
          radius={[3, 3, 0, 0]}
          isAnimationActive={true}
          animationDuration={600}
        />

        {/* Expense bars */}
        <Bar
          yAxisId="left"
          dataKey="expense"
          name={t('chart.expense')}
          fill={expenseColor}
          fillOpacity={0.85}
          radius={[3, 3, 0, 0]}
          isAnimationActive={true}
          animationDuration={600}
        />

        {/* Balance line */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="balance"
          name={t('forecast.balance')}
          stroke={balanceColor}
          strokeWidth={2.5}
          dot={{ r: 3, fill: balanceColor, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          isAnimationActive={true}
          animationDuration={800}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
