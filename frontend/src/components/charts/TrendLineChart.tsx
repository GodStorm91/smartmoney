import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useTheme } from '@/contexts/ThemeContext'
import type { MonthlyData } from '@/types'

interface TrendLineChartProps {
  data: MonthlyData[]
  dataKey: 'income' | 'expense' | 'net'
}

const colorMap = {
  income: '#4CAF50',
  expense: '#F44336',
  net: '#2196F3',
}

export function TrendLineChart({ data, dataKey }: TrendLineChartProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const { t } = useTranslation('common')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Dark mode colors (Catppuccin Mocha inspired)
  const gridColor = isDark ? '#45475a' : '#E5E7EB'
  const axisColor = isDark ? '#a6adc8' : '#6B7280'
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const legendColor = isDark ? '#cdd6f4' : '#374151'

  const labelMap = {
    income: t('chart.income'),
    expense: t('chart.expense'),
    net: t('chart.net'),
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="month"
          stroke={axisColor}
          style={{ fontSize: '12px', fontFamily: 'Noto Sans JP, sans-serif' }}
        />
        <YAxis
          stroke={axisColor}
          style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
          tickFormatter={(value) => formatCurrencyPrivacy(value, currency, exchangeRates?.rates || {}, false, isPrivacyMode)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            fontSize: '14px',
            color: legendColor,
          }}
          formatter={(value: number) => [formatCurrencyPrivacy(value, currency, exchangeRates?.rates || {}, false, isPrivacyMode), labelMap[dataKey]]}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', fontFamily: 'Noto Sans JP, sans-serif', color: legendColor }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={colorMap[dataKey]}
          strokeWidth={2}
          dot={{ fill: colorMap[dataKey], r: 4 }}
          activeDot={{ r: 6 }}
          name={labelMap[dataKey]}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
