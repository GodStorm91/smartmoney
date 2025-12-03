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
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import type { MonthlyData } from '@/types'

interface IncomeExpenseBarChartProps {
  data: MonthlyData[]
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          formatter={(value: number) => formatCurrency(value, currency, exchangeRates?.rates || {}, false)}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', fontFamily: 'Noto Sans JP, sans-serif', color: legendColor }}
        />
        <Bar dataKey="income" fill="#4CAF50" name={t('chart.income')} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#F44336" name={t('chart.expense')} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
