import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import type { ForecastMonth } from '@/types'

interface ForecastChartProps {
  data: ForecastMonth[]
}

// Format month key (YYYY-MM) to short display (Jan, Feb, etc.)
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short' })
}

// Format large numbers compactly
function formatCompact(value: number, currency: string): string {
  if (value === 0) return ''
  const absValue = Math.abs(value)

  if (currency === 'VND') {
    if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  if (currency === 'JPY') {
    if (absValue >= 10000) return `${(value / 10000).toFixed(1)}万`
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
  const { t } = useTranslation('common')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Theme colors
  const gridColor = isDark ? '#45475a' : '#E5E7EB'
  const axisColor = isDark ? '#a6adc8' : '#6B7280'
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const legendColor = isDark ? '#cdd6f4' : '#374151'

  // Colors for actual vs projected
  const actualIncomeColor = '#4CAF50'
  const actualExpenseColor = '#F44336'
  const projectedIncomeColor = '#81C784' // lighter green
  const projectedExpenseColor = '#E57373' // lighter red
  const balanceColor = '#2196F3'

  // Add formatted month labels
  const chartData = data.map(d => ({
    ...d,
    monthLabel: formatMonthLabel(d.month),
  }))

  // Find the index where projections start
  const projectionStartIndex = chartData.findIndex(d => !d.is_actual)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="monthLabel"
          stroke={axisColor}
          style={{ fontSize: '12px', fontFamily: 'Noto Sans JP, sans-serif' }}
        />
        <YAxis
          yAxisId="left"
          stroke={axisColor}
          style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
          tickFormatter={(value) => formatCompact(value, currency)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={balanceColor}
          style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
          tickFormatter={(value) => formatCompact(value, currency)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            fontSize: '14px',
            color: legendColor,
          }}
          formatter={(value: number, name: string) => [
            formatCurrency(value, currency, exchangeRates?.rates || {}, false),
            name
          ]}
          labelFormatter={(_, payload) => {
            if (payload && payload[0]) {
              const item = payload[0].payload as ForecastMonth & { monthLabel: string }
              return `${item.month} ${item.is_actual ? `(${t('forecast.actual')})` : `(${t('forecast.projected')})`}`
            }
            return ''
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', fontFamily: 'Noto Sans JP, sans-serif', color: legendColor }}
        />

        {/* Reference line at projection start */}
        {projectionStartIndex > 0 && (
          <ReferenceLine
            x={chartData[projectionStartIndex]?.monthLabel}
            stroke={isDark ? '#6c7086' : '#9CA3AF'}
            strokeDasharray="5 5"
            label={{
              value: t('forecast.projected'),
              position: 'top',
              fill: axisColor,
              fontSize: 11,
            }}
          />
        )}

        {/* Income bars */}
        <Bar
          yAxisId="left"
          dataKey="income"
          name={t('chart.income')}
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`income-${index}`}
              fill={entry.is_actual ? actualIncomeColor : projectedIncomeColor}
              fillOpacity={entry.is_actual ? 1 : 0.7}
            />
          ))}
        </Bar>

        {/* Expense bars */}
        <Bar
          yAxisId="left"
          dataKey="expense"
          name={t('chart.expense')}
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationBegin={200}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`expense-${index}`}
              fill={entry.is_actual ? actualExpenseColor : projectedExpenseColor}
              fillOpacity={entry.is_actual ? 1 : 0.7}
            />
          ))}
        </Bar>

        {/* Balance line */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="balance"
          name={t('forecast.balance')}
          stroke={balanceColor}
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props
            // Guard against undefined coordinates - return invisible circle
            if (cx === undefined || cy === undefined) {
              return <circle cx={0} cy={0} r={0} fill="transparent" />
            }
            return (
              <circle
                cx={cx}
                cy={cy}
                r={payload?.is_actual ? 4 : 5}
                fill={balanceColor}
                stroke={payload?.is_actual ? balanceColor : '#fff'}
                strokeWidth={payload?.is_actual ? 0 : 2}
                strokeDasharray={payload?.is_actual ? undefined : '2 2'}
              />
            )
          }}
          activeDot={{ r: 6 }}
          isAnimationActive={true}
          animationBegin={400}
          animationDuration={1000}
          strokeDasharray={undefined}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
