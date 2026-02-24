import { Card } from '@/components/ui/Card'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title: string
  amount: number
  change?: number
  icon: React.ReactNode
  type?: 'income' | 'expense' | 'net'
  clickable?: boolean
  className?: string
  'aria-label'?: string
}

const shadowStyles: Record<string, React.CSSProperties> = {
  income: { boxShadow: '0 4px 20px hsl(142 30% 50% / 0.12)' },
  expense: { boxShadow: '0 4px 20px hsl(350 40% 55% / 0.12)' },
  net: { boxShadow: '0 4px 20px hsl(213 38% 55% / 0.12)' },
}

export function KPICard({ title, amount, change, icon, type, clickable, className, ...props }: KPICardProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const colorClasses = {
    income: {
      bg: 'bg-income-50 dark:bg-income-900/20',
      text: 'text-income-600 dark:text-income-300',
      badge: 'text-income-600 dark:text-income-300 bg-income-100 dark:bg-income-900/30',
      icon: 'text-income-600 dark:text-income-300',
    },
    expense: {
      bg: 'bg-expense-50 dark:bg-expense-900/20',
      text: 'text-expense-600 dark:text-expense-300',
      badge: 'text-expense-600 dark:text-expense-300 bg-expense-100 dark:bg-expense-900/30',
      icon: 'text-expense-600 dark:text-expense-300',
    },
    net: {
      bg: 'bg-net-50 dark:bg-net-900/20',
      text: 'text-net-600 dark:text-net-300',
      badge: 'text-net-600 dark:text-net-300 bg-net-100 dark:bg-net-900/30',
      icon: 'text-net-600 dark:text-net-300',
    },
  }

  const colors = type ? colorClasses[type] : { bg: 'bg-gray-50 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-400', badge: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700', icon: 'text-gray-600 dark:text-gray-500' }

  return (
    <Card
      hover={clickable}
      className={cn(clickable && 'transition-all duration-300 hover:-translate-y-1', className)}
      style={type ? shadowStyles[type] : undefined}
      role="region"
      {...props}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2.5 rounded-xl', colors.bg)}>
          <div className={cn('w-6 h-6', colors.icon)}>{icon}</div>
        </div>
        {change != null && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full',
            colors.badge
          )}>
            {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="font-numbers">{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">{title}</p>
        <p className={cn('text-2xl sm:text-3xl font-bold font-numbers tracking-tight', colors.text)}>
          {formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)}
        </p>
      </div>
    </Card>
  )
}
