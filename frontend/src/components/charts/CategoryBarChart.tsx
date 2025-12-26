import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { useTranslation } from 'react-i18next'
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
            formatter={(_value: number, _name: string, props: any) => {
              const item = props.payload
              return [
                formatCurrency(item.amount, currency, exchangeRates?.rates || {}, false),
                item.category
              ]
            }}
            labelFormatter={() => ''}
          />
          <Bar
            dataKey="percentage"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
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
