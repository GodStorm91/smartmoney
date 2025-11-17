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
import { formatCurrency } from '@/utils/formatCurrency'
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

const labelMap = {
  income: '収入',
  expense: '支出',
  net: '差額',
}

export function TrendLineChart({ data, dataKey }: TrendLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="month"
          stroke="#6B7280"
          style={{ fontSize: '12px', fontFamily: 'Noto Sans JP, sans-serif' }}
        />
        <YAxis
          stroke="#6B7280"
          style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
          }}
          formatter={(value: number) => [formatCurrency(value), labelMap[dataKey]]}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', fontFamily: 'Noto Sans JP, sans-serif' }}
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
