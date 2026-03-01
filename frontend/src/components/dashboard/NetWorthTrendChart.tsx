import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import type { MonthlyData } from '@/types'

interface NetWorthTrendChartProps {
  data?: MonthlyData[]
}

export function NetWorthTrendChart({ data }: NetWorthTrendChartProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? '#45475a' : '#E5E7EB'
  const axisColor = isDark ? '#a6adc8' : '#6B7280'
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const tooltipText = isDark ? '#cdd6f4' : '#374151'

  const fmt = (value: number) =>
    formatCurrencyPrivacy(value, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  // Accumulate net into running net worth
  const chartData = data?.reduce<Array<{ month: string; netWorth: number }>>((acc, d) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].netWorth : 0
    acc.push({ month: d.month, netWorth: prev + d.net })
    return acc
  }, [])

  if (!chartData || chartData.length === 0) return null

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30">
          <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          {t('dashboard.netWorthTrend', 'Net Worth Trend')}
        </h3>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="month"
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmt}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                fontSize: '13px',
                color: tooltipText,
              }}
              formatter={(value: number) => [fmt(value), t('dashboard.netWorth', 'Net Worth')]}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#netWorthGrad)"
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
