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
    <Card className={cn('p-3 sm:p-4', className)}>
      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-300 mb-1.5 sm:mb-2 uppercase tracking-[0.12em]">{label}</p>
      <p className={cn(
        'text-xl sm:text-[1.65rem] font-extrabold font-numbers tracking-tight leading-none',
        isPositive ? 'text-income-600 dark:text-income-300' : 'text-expense-600 dark:text-expense-300'
      )}>
        {formatCurrency(value)}
      </p>
      {change !== 0 && (
        <div className={cn(
          'flex items-center gap-1 mt-2 text-xs font-bold',
          (isPositive && change > 0) || (!isPositive && change < 0)
            ? 'text-income-600 dark:text-income-300'
            : 'text-expense-600 dark:text-expense-300'
        )}>
          {change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(change)}%
        </div>
      )}
    </Card>
  )
}
