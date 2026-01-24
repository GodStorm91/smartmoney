import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card } from '@/components/ui/Card'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { BudgetAllocation } from '@/types'

interface BudgetDonutChartProps {
  allocations: BudgetAllocation[]
  totalBudget: number
  totalAllocated: number
  className?: string
}

// Category colors - consistent with the app's design system
const COLORS = [
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500 (Other)
]

interface ChartDataItem {
  name: string
  value: number
  percentage: number
  color: string
}

export function BudgetDonutChart({
  allocations,
  totalBudget,
  totalAllocated,
  className
}: BudgetDonutChartProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  // Prepare chart data - max 5 categories + "Other"
  const chartData = useMemo((): ChartDataItem[] => {
    if (!allocations.length) return []

    // Sort by amount descending
    const sorted = [...allocations].sort((a, b) => b.amount - a.amount)

    // Take top 5 categories
    const top5 = sorted.slice(0, 5)
    const others = sorted.slice(5)

    // Calculate "Other" total if needed
    const othersTotal = others.reduce((sum, a) => sum + a.amount, 0)

    const data: ChartDataItem[] = top5.map((a, idx) => ({
      name: a.category,
      value: a.amount,
      percentage: totalAllocated > 0 ? (a.amount / totalAllocated) * 100 : 0,
      color: COLORS[idx % COLORS.length]
    }))

    // Add "Other" category if there are more than 5 categories
    if (othersTotal > 0) {
      data.push({
        name: t('budget.donutChart.other'),
        value: othersTotal,
        percentage: totalAllocated > 0 ? (othersTotal / totalAllocated) * 100 : 0,
        color: COLORS[7] // gray
      })
    }

    return data
  }, [allocations, totalAllocated, t])

  const remaining = totalBudget - totalAllocated

  // Custom active shape for hover effect
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-xs">
          {payload.name}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-900 dark:fill-gray-100 text-sm font-bold">
          {formatCurrency(payload.value)}
        </text>
      </g>
    )
  }

  if (!allocations.length) {
    return null
  }

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('budget.donutChart.title')}
      </h3>

      <div className="flex flex-col items-center">
        {/* Donut Chart */}
        <div className="relative w-[200px] h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                activeIndex={activeIndex ?? undefined}
                activeShape={activeIndex !== null ? renderActiveShape : undefined}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Text - Only show when not hovering */}
          {activeIndex === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {remaining >= 0 ? t('budget.donutChart.remaining') : t('budget.overAllocated')}
              </span>
              <span className={cn(
                'text-lg font-bold',
                remaining >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
              )}>
                {remaining >= 0 ? formatCurrency(remaining) : `-${formatCurrency(Math.abs(remaining))}`}
              </span>
            </div>
          )}
        </div>

        {/* Legend - 2 column grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full max-w-xs">
          {chartData.map((item, index) => (
            <button
              key={index}
              className={cn(
                'flex items-center gap-2 text-left p-1 rounded transition-colors',
                activeIndex === index && 'bg-gray-100 dark:bg-gray-800'
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {item.name}
              </span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100 ml-auto">
                {Math.round(item.percentage)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
