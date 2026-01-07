import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'
import type { MonthlyData } from '@/types'

interface CashFlowSummaryProps {
  data: MonthlyData[]
  savingsGoal?: number | null
}

/**
 * CashFlowSummary - Fallback visualization when < 3 data points
 * Shows comparison bars: Current month vs 3-month average
 * Optionally shows progress toward savings goal
 */
export function CashFlowSummary({ data, savingsGoal }: CashFlowSummaryProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Dark mode colors
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const textColor = isDark ? '#cdd6f4' : '#374151'

  // Calculate current month and average
  const currentMonth = data.length > 0 ? data[data.length - 1] : null
  const currentNet = currentMonth?.net || 0

  // Calculate 3-month average (excluding current if we have it)
  const historicalData = data.length > 1 ? data.slice(0, -1) : data
  const avgNet = historicalData.length > 0
    ? historicalData.reduce((sum, d) => sum + d.net, 0) / historicalData.length
    : currentNet

  // Prepare comparison data
  const comparisonData = [
    {
      name: t('analytics.thisMonth'),
      value: currentNet,
      color: currentNet >= 0 ? '#4CAF50' : '#F44336',
    },
    {
      name: t('analytics.average'),
      value: avgNet,
      color: '#9E9E9E',
    },
  ]

  // Calculate change percentage
  const changePercent = avgNet !== 0 ? ((currentNet - avgNet) / Math.abs(avgNet)) * 100 : 0
  const isPositiveChange = changePercent >= 0

  // Goal progress (if available)
  const goalProgress = savingsGoal && savingsGoal > 0
    ? Math.min((currentNet / savingsGoal) * 100, 100)
    : null

  // Single data point - show just the value with context
  if (data.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {t('analytics.netCashFlow')}
        </p>
        <p className={cn(
          'text-3xl font-bold',
          currentNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          {formatCurrency(currentNet, currency, exchangeRates?.rates || {}, false)}
        </p>
        {currentNet >= 0 && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            {t('analytics.positiveCashFlow')}
          </p>
        )}
        {savingsGoal && savingsGoal > 0 && (
          <div className="mt-4 w-full max-w-xs">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{t('analytics.savingsGoal')}</span>
              <span>{(goalProgress ?? 0).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  goalProgress && goalProgress >= 100
                    ? 'bg-green-500'
                    : 'bg-primary-500'
                )}
                style={{ width: `${goalProgress || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {formatCurrency(savingsGoal, currency, exchangeRates?.rates || {}, false)} {t('analytics.target')}
            </p>
          </div>
        )}
      </div>
    )
  }

  // 2+ data points - show comparison bars
  return (
    <div className="w-full h-full flex flex-col">
      {/* Comparison Bar Chart */}
      <div className="flex-1 min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonData}
            layout="vertical"
            margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: textColor,
              }}
              formatter={(value: number) => [
                formatCurrency(value, currency, exchangeRates?.rates || {}, false),
                t('analytics.netCashFlow')
              ]}
            />
            {savingsGoal && savingsGoal > 0 && (
              <ReferenceLine
                x={savingsGoal}
                stroke="#9C27B0"
                strokeDasharray="3 3"
                label={{
                  value: t('analytics.goal'),
                  position: 'top',
                  fill: '#9C27B0',
                  fontSize: 10,
                }}
              />
            )}
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              maxBarSize={32}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {comparisonData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Change indicator */}
      <div className="flex items-center justify-center gap-2 py-2 border-t border-gray-100 dark:border-gray-800">
        <span className={cn(
          'text-sm font-medium',
          isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          {isPositiveChange ? '▲' : '▼'} {Math.abs(changePercent).toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('analytics.vsAverage')}
        </span>
      </div>

      {/* Goal progress bar (if available) */}
      {savingsGoal && savingsGoal > 0 && (
        <div className="px-4 pb-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{t('analytics.savingsGoal')}</span>
            <span>
              {formatCurrency(currentNet, currency, exchangeRates?.rates || {}, false)} / {formatCurrency(savingsGoal, currency, exchangeRates?.rates || {}, false)}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                goalProgress && goalProgress >= 100
                  ? 'bg-green-500'
                  : 'bg-primary-500'
              )}
              style={{ width: `${goalProgress || 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
