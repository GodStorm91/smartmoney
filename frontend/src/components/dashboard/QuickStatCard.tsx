import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

interface QuickStatCardProps {
  label: string
  value: number
  change: number
  isPositive: boolean
  formatCurrency: (amount: number) => string
  className?: string
}

export function QuickStatCard({ label, value, change, isPositive, formatCurrency, className }: QuickStatCardProps) {
  return (
    <Card className={cn('p-4 shadow-card', className)}>
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold font-numbers text-gray-900 dark:text-gray-100 tracking-tight">
        {formatCurrency(value)}
      </p>
      {change !== 0 && (
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs font-medium',
          (isPositive && change > 0) || (!isPositive && change < 0)
            ? 'text-income-600 dark:text-income-300'
            : 'text-expense-600 dark:text-expense-300'
        )}>
          {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      )}
    </Card>
  )
}
