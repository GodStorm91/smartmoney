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
  LabelList,
  Cell,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import type { MonthlyData } from '@/types'

interface IncomeExpenseBarChartProps {
  data: MonthlyData[]
}

// Format large numbers compactly for bar labels
function formatCompact(value: number, currency: string): string {
  if (value === 0) return ''
  const absValue = Math.abs(value)

  // For VND, use M for millions
  if (currency === 'VND') {
    if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  // For JPY, use 万 (10K) or K
  if (currency === 'JPY') {
    if (absValue >= 10000) return `${(value / 10000).toFixed(1)}万`
    if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  // For USD and others
  if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toString()
}

export function IncomeExpenseBarChart({ data }: IncomeExpenseBarChartProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { t } = useTranslation('common')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Dark mode colors (Catppuccin Mocha inspired)
  const gridColor = isDark ? '#45475a' : '#E5E7EB'
  const axisColor = isDark ? '#a6adc8' : '#6B7280'
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const legendColor = isDark ? '#cdd6f4' : '#374151'

  // Check if all expenses are zero (backend returns 'expenses' field)
  const hasNoExpenses = data.every(d => d.expenses === 0)

  // Calculate net for line overlay
  const enhancedData = data.map(d => ({
    ...d,
    net: d.income - d.expenses,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={enhancedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="month"
          stroke={axisColor}
          style={{ fontSize: '12px', fontFamily: 'Noto Sans JP, sans-serif' }}
        />
        <YAxis
          stroke={axisColor}
          style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
          tickFormatter={(value) => formatCurrency(value, currency, exchangeRates?.rates || {}, false)}
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
          labelFormatter={(label) => label}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', fontFamily: 'Noto Sans JP, sans-serif', color: legendColor }}
        />
        <Bar
          dataKey="income"
          fill="#4CAF50"
          name={t('chart.income')}
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationBegin={0}
          animationDuration={800}
          animationEasing="ease-out"
        >
          <LabelList
            dataKey="income"
            position="top"
            formatter={(value: number) => formatCompact(value, currency)}
            style={{ fontSize: '10px', fill: '#4CAF50', fontWeight: 500 }}
          />
        </Bar>
        <Bar
          dataKey="expenses"
          fill="#F44336"
          name={t('chart.expense')}
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationBegin={200}
          animationDuration={800}
          animationEasing="ease-out"
        >
          {hasNoExpenses ? (
            // Show subtle indicator for zero expense
            enhancedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill="#F4433633" />
            ))
          ) : (
            enhancedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.expenses === 0 ? '#F4433633' : '#F44336'} />
            ))
          )}
          <LabelList
            dataKey="expenses"
            position="top"
            formatter={(value: number) => formatCompact(value, currency)}
            style={{ fontSize: '10px', fill: '#F44336', fontWeight: 500 }}
          />
        </Bar>
        <Line
          type="monotone"
          dataKey="net"
          name={t('chart.net')}
          stroke="#2196F3"
          strokeWidth={2}
          dot={{ fill: '#2196F3', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
          isAnimationActive={true}
          animationBegin={400}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
