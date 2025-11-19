import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { CategoryBreakdown } from '@/types'

interface CategoryPieChartProps {
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

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  // Calculate total for percentage calculation
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  // Custom label function that calculates percentage
  const renderLabel = (entry: any) => {
    const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0'
    return `${entry.category} (${percentage}%)`
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="amount"
          nameKey="category"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
          }}
          formatter={(value: number) => formatCurrency(value, currency, exchangeRates?.rates || {}, false)}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', fontFamily: 'Noto Sans JP, sans-serif' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
