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
  'aria-label'?: string
}

export function KPICard({ title, amount, change, icon, type, clickable, ...props }: KPICardProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const colorClasses = {
    income: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      badge: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30',
      icon: 'text-green-600 dark:text-green-500',
    },
    expense: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      badge: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-500',
    },
    net: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30',
      icon: 'text-blue-600 dark:text-blue-500',
    },
  }

  const colors = type ? colorClasses[type] : { bg: 'bg-gray-50 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-400', badge: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700', icon: 'text-gray-600 dark:text-gray-500' }

  return (
    <Card
      hover={clickable}
      className={clickable ? 'transition-all duration-300 hover:-translate-y-1' : undefined}
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
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <p className={cn('text-2xl sm:text-3xl font-bold font-numbers tracking-tight', colors.text)}>
          {formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)}
        </p>
      </div>
    </Card>
  )
}
