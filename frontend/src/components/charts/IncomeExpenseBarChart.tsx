import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/utils/formatCurrency'
import type { MonthlyData } from '@/types'

interface IncomeExpenseBarChartProps {
  data: MonthlyData[]
}

export function IncomeExpenseBarChart({ data }: IncomeExpenseBarChartProps) {
  const { t } = useTranslation('common')

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', fontFamily: 'Noto Sans JP, sans-serif' }}
        />
        <Bar dataKey="income" fill="#4CAF50" name={t('chart.income')} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#F44336" name={t('chart.expense')} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
