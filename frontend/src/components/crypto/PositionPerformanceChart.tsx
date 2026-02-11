/**
 * PositionPerformanceChart - Line chart showing position value over time
 */
import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { getLocaleTag } from '@/utils/formatDate'
import type { DefiPositionSnapshot } from '@/types'

interface PositionPerformanceChartProps {
  snapshots: DefiPositionSnapshot[]
}

export function PositionPerformanceChart({ snapshots }: PositionPerformanceChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Theme colors
  const gridColor = isDark ? '#374151' : '#E5E7EB'
  const textColor = isDark ? '#9CA3AF' : '#6B7280'
  const tooltipBg = isDark ? '#1F2937' : '#FFFFFF'
  const tooltipBorder = isDark ? '#374151' : '#E5E7EB'
  const lineColor = '#6366F1' // Indigo

  // Process and sort data chronologically
  const chartData = useMemo(() => {
    return [...snapshots]
      .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime())
      .map((snap) => ({
        date: snap.snapshot_date,
        value: Number(snap.balance_usd),
        formattedDate: new Date(snap.snapshot_date).toLocaleDateString(getLocaleTag(), {
          month: 'short',
          day: 'numeric',
        }),
      }))
  }, [snapshots])

  // Calculate Y-axis domain with padding
  const [minValue, maxValue] = useMemo(() => {
    const values = chartData.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.1 || 10
    return [Math.max(0, min - padding), max + padding]
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No historical data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="formattedDate"
          tick={{ fill: textColor, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: gridColor }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minValue, maxValue]}
          tick={{ fill: textColor, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toFixed(0)}`}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: textColor, fontWeight: 'bold' }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2}
          dot={chartData.length <= 10}
          activeDot={{ r: 6, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
