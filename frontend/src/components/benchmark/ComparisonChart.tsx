import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'

export interface ComparisonData {
  category: string
  user_amount: number
  benchmark_amount: number
  difference_pct: number
  status: 'over' | 'under' | 'neutral'
}

interface ComparisonChartProps {
  comparison: ComparisonData[]
}

export function ComparisonChart({ comparison }: ComparisonChartProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Colors
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const textColor = isDark ? '#cdd6f4' : '#374151'
  const userColor = 'hsl(var(--primary-600))'
  const benchmarkColor = isDark ? '#9ca3af' : '#9ca3af' // gray-400

  // Prepare chart data - create two bars per category
  const chartData = comparison.map((item) => ({
    category: item.category,
    user: item.user_amount,
    benchmark: item.benchmark_amount,
    difference_pct: item.difference_pct,
    status: item.status,
  }))

  // Custom label for difference badge
  const renderDifferenceBadge = (props: any) => {
    const { x, y, width, height, index } = props
    const item = comparison[index]
    if (!item) return null

    const diff = item.difference_pct
    const isOver = item.status === 'over'
    const isUnder = item.status === 'under'

    // Position badge to the right of bars
    const badgeX = x + width + 12

    return (
      <g>
        <text
          x={badgeX}
          y={y + height / 2}
          fill={isOver ? '#ef4444' : isUnder ? '#22c55e' : '#6b7280'}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={600}
        >
          {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
        </text>
      </g>
    )
  }

  const chartHeight = Math.max(300, comparison.length * 70)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            width={110}
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
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const data = payload[0].payload
              const userAmount = data.user
              const benchAmount = data.benchmark
              const diff = data.difference_pct
              const status = data.status

              return (
                <div className="p-3 rounded-lg shadow-lg" style={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}>
                  <p className="font-semibold mb-2">{data.category}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-primary-600 dark:text-primary-400">{t('benchmark.yourSpending', 'Your spending')}:</span>
                      <span className="font-medium">{formatCurrency(userAmount, currency, exchangeRates?.rates || {}, false)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-500 dark:text-gray-400">{t('benchmark.avgSpending', 'Average')}:</span>
                      <span className="font-medium">{formatCurrency(benchAmount, currency, exchangeRates?.rates || {}, false)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t('benchmark.difference', 'Difference')}:</span>
                      <span className={cn(
                        'text-xs font-semibold flex items-center gap-1',
                        status === 'over' ? 'text-red-600 dark:text-red-400' : status === 'under' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                      )}>
                        {status === 'over' && <TrendingUp className="w-3 h-3" />}
                        {status === 'under' && <TrendingDown className="w-3 h-3" />}
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            }}
          />

          {/* Benchmark bar (background) */}
          <Bar
            dataKey="benchmark"
            fill={benchmarkColor}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            isAnimationActive={true}
            animationDuration={600}
          />

          {/* User bar (foreground) */}
          <Bar
            dataKey="user"
            fill={userColor}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            isAnimationActive={true}
            animationDuration={800}
            animationBegin={200}
          >
            <LabelList content={renderDifferenceBadge} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: userColor }} />
          <span className="text-gray-700 dark:text-gray-300">{t('benchmark.yourSpending', 'Your spending')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">{t('benchmark.avgSpending', 'Average')}</span>
        </div>
      </div>
    </div>
  )
}
