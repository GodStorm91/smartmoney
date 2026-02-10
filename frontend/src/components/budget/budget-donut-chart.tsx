import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
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
  compact?: boolean
  className?: string
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280',
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
  compact = false,
  className
}: BudgetDonutChartProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  const chartData = useMemo((): ChartDataItem[] => {
    if (!allocations.length) return []
    const sorted = [...allocations].sort((a, b) => b.amount - a.amount)
    const top5 = sorted.slice(0, 5)
    const others = sorted.slice(5)
    const othersTotal = others.reduce((sum, a) => sum + a.amount, 0)

    const data: ChartDataItem[] = top5.map((a, idx) => ({
      name: a.category,
      value: a.amount,
      percentage: totalAllocated > 0 ? (a.amount / totalAllocated) * 100 : 0,
      color: COLORS[idx % COLORS.length]
    }))

    if (othersTotal > 0) {
      data.push({
        name: t('budget.donutChart.other'),
        value: othersTotal,
        percentage: totalAllocated > 0 ? (othersTotal / totalAllocated) * 100 : 0,
        color: COLORS[7]
      })
    }
    return data
  }, [allocations, totalAllocated, t])

  const remaining = totalBudget - totalAllocated

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 4}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[10px]">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-gray-900 dark:fill-gray-100 text-xs font-bold">
          {formatCurrency(payload.value)}
        </text>
      </g>
    )
  }

  if (!allocations.length) return null

  const size = compact ? 120 : 200
  const inner = compact ? 36 : 55
  const outer = compact ? 52 : 80

  return (
    <div className={cn(
      compact ? 'flex items-center gap-4' : 'flex flex-col items-center',
      className
    )}>
      {/* Chart */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={inner} outerRadius={outer}
              paddingAngle={2} dataKey="value"
              activeIndex={activeIndex ?? undefined}
              activeShape={activeIndex !== null ? renderActiveShape : undefined}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} className="cursor-pointer transition-opacity hover:opacity-80" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {activeIndex === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={cn('text-gray-500 dark:text-gray-400', compact ? 'text-[9px]' : 'text-xs')}>
              {remaining >= 0 ? t('budget.donutChart.remaining') : t('budget.overAllocated')}
            </span>
            <span className={cn(
              'font-bold',
              compact ? 'text-xs' : 'text-lg',
              remaining >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
            )}>
              {remaining >= 0 ? formatCurrency(remaining) : `−${formatCurrency(Math.abs(remaining))}`}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={cn(
        'grid gap-y-1 gap-x-4',
        compact ? 'grid-cols-1 flex-1 min-w-0' : 'grid-cols-2 mt-4 w-full max-w-xs'
      )}>
        {chartData.map((item, index) => (
          <button
            key={index}
            className={cn(
              'flex items-center gap-2 text-left p-1 rounded transition-colors min-w-0',
              activeIndex === index && 'bg-gray-100 dark:bg-gray-800'
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 ml-auto flex-shrink-0">
              {Math.round(item.percentage)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
