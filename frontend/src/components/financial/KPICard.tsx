import { Card } from '@/components/ui/Card'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'

interface KPICardProps {
  title: string
  amount: number
  change?: number
  icon: React.ReactNode
  type?: 'income' | 'expense' | 'net'
  'aria-label'?: string
}

export function KPICard({ title, amount, change, icon, type, ...props }: KPICardProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const colorClasses = {
    income: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      badge: 'text-green-700 bg-green-50',
    },
    expense: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      badge: 'text-red-700 bg-red-50',
    },
    net: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      badge: 'text-blue-700 bg-blue-50',
    },
  }

  const colors = type ? colorClasses[type] : { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'text-gray-700 bg-gray-50' }

  return (
    <Card hover role="region" {...props}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-lg', colors.bg)}>{icon}</div>
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full',
              colors.badge
            )}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {change >= 0 ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              )}
            </svg>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className={cn('text-4xl font-bold font-numbers', type === 'net' && 'text-blue-600')}>
          {formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)}
        </p>
      </div>
    </Card>
  )
}
