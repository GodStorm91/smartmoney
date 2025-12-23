import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useTheme } from '@/contexts/ThemeContext'
import type { CategoryBreakdown } from '@/types'

interface CategoryBarChartProps {
  data: CategoryBreakdown[]
}

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

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Dark mode colors
  const tooltipBg = isDark ? '#1e1e2e' : '#fff'
  const tooltipBorder = isDark ? '#45475a' : '#E5E7EB'
  const textColor = isDark ? '#cdd6f4' : '#374151'

  // Calculate total for percentage calculation
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  // Sort data by amount (descending) and add percentage
  const sortedData = [...data]
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      ...item,
      percentage: total > 0 ? ((item.amount / total) * 100) : 0,
      color: COLORS[index % COLORS.length],
    }))

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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={sortedData}
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
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <LabelList dataKey="percentage" content={renderLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
