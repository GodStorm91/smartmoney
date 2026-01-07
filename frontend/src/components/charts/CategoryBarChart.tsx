import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'
import type { CategoryBreakdown } from '@/types'

interface CategoryBarChartProps {
  data: CategoryBreakdown[]
}

const TOP_N = 7

const COLORS = [
  '#4CAF50', // Primary green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#FFEB3B', // Yellow
  '#795548', // Brown
  '#607D8B', // Blue Grey
]

interface ChartDataItem extends CategoryBreakdown {
  color: string
  isOther?: boolean
  otherCount?: number
}

// Comparison badge component
function ComparisonBadge({ changePercent }: { changePercent: number | null | undefined }) {
  if (changePercent === null || changePercent === undefined) return null

  const isUp = changePercent > 0
  const isSignificant = Math.abs(changePercent) >= 20

  if (changePercent === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
        <Minus className="w-3 h-3" />
        <span>0%</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isUp ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
        isSignificant && 'font-bold'
      )}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{isUp ? '+' : ''}{changePercent.toFixed(0)}%</span>
    </span>
  )
}

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [showAll, setShowAll] = useState(false)

  // Dark mode colors
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const textColor = isDark ? '#cdd6f4' : '#374151'

  // Calculate total for percentage calculation
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  // Sort data by amount (descending)
  const sortedData = [...data].sort((a, b) => b.amount - a.amount)

  // Create display data: Top N + "Other" bucket
  const createDisplayData = (): ChartDataItem[] => {
    if (sortedData.length <= TOP_N || showAll) {
      // Show all categories
      return sortedData.map((item, index) => ({
        ...item,
        percentage: total > 0 ? ((item.amount / total) * 100) : 0,
        color: COLORS[index % COLORS.length],
      }))
    }

    // Group into Top N + Other
    const topCategories = sortedData.slice(0, TOP_N)
    const otherCategories = sortedData.slice(TOP_N)
    const otherTotal = otherCategories.reduce((sum, c) => sum + c.amount, 0)

    const result: ChartDataItem[] = topCategories.map((item, index) => ({
      ...item,
      percentage: total > 0 ? ((item.amount / total) * 100) : 0,
      color: COLORS[index % COLORS.length],
    }))

    if (otherCategories.length > 0) {
      result.push({
        category: `${t('analytics.otherCategories')} (${otherCategories.length})`,
        amount: otherTotal,
        percentage: total > 0 ? ((otherTotal / total) * 100) : 0,
        color: '#9E9E9E', // Gray for "Other"
        isOther: true,
        otherCount: otherCategories.length,
      })
    }

    return result
  }

  const displayData = createDisplayData()
  const hasOther = sortedData.length > TOP_N

  // Custom label formatter
  const renderLabel = (props: any) => {
    const { x, y, width, height, value } = props
    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill={textColor}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={12}
      >
        {value.toFixed(1)}%
      </text>
    )
  }

  // Calculate dynamic height based on number of items
  const chartHeight = Math.max(200, displayData.length * 32)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={displayData}
          layout="vertical"
          margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
        >
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="category"
            width={100}
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
              const item = payload[0].payload as ChartDataItem
              const hasChange = item.change_percent !== null && item.change_percent !== undefined
              return (
                <div className="p-3 rounded-lg shadow-lg" style={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}>
                  <p className="font-medium mb-1">{item.category}</p>
                  <p className="text-sm">{formatCurrency(item.amount, currency, exchangeRates?.rates || {}, false)}</p>
                  {hasChange && (
                    <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t('analytics.vsPrevious')}: </span>
                      <ComparisonBadge changePercent={item.change_percent} />
                    </div>
                  )}
                </div>
              )
            }}
          />
          <Bar
            dataKey="percentage"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList dataKey="percentage" content={renderLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Expand/Collapse button for "Other" categories */}
      {hasOther && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={cn(
            'w-full mt-2 py-2 px-4 text-sm font-medium rounded-lg transition-colors',
            'text-primary-600 dark:text-primary-400',
            'hover:bg-primary-50 dark:hover:bg-primary-900/20'
          )}
        >
          {showAll
            ? t('analytics.showLessCategories')
            : t('analytics.showAllCategories', { count: sortedData.length })
          }
        </button>
      )}
    </div>
  )
}
