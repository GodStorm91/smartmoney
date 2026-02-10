import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

interface QuickStatCardProps {
  label: string
  value: number
  change: number
  isPositive: boolean
  formatCurrency: (amount: number) => string
}

export function QuickStatCard({ label, value, change, isPositive, formatCurrency }: QuickStatCardProps) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold font-numbers text-gray-900 dark:text-gray-100">
        {formatCurrency(value)}
      </p>
      {change !== 0 && (
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs font-medium',
          (isPositive && change > 0) || (!isPositive && change < 0)
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        )}>
          {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      )}
    </Card>
  )
}
