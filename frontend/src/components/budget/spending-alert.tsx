import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle, XCircle, X, ChevronRight } from 'lucide-react'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { BudgetTrackingItem } from '@/types'

interface SpendingAlertProps {
  categories: BudgetTrackingItem[]
  daysRemaining: number
  onViewCategory?: (category: string) => void
  className?: string
}

type AlertType = 'exceeded' | 'warning' | 'onTrack'

interface Alert {
  type: AlertType
  category?: string
  message: string
  action?: string
}

export function SpendingAlert({
  categories,
  daysRemaining,
  onViewCategory,
  className
}: SpendingAlertProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  const generateAlerts = (): Alert[] => {
    const alerts: Alert[] = []
    const exceeded = categories.filter(c => c.status === 'red')
    const warning = categories.filter(c => c.status === 'orange')
    const onTrack = categories.filter(c => c.status === 'green' || c.status === 'yellow')

    // Exceeded — actionable: "Cut X by Y to get back on track"
    exceeded.slice(0, 2).forEach(cat => {
      const overAmount = Math.abs(cat.remaining)
      alerts.push({
        type: 'exceeded',
        category: cat.category,
        message: t('budget.alerts.exceededBy', {
          category: cat.category,
          amount: formatCurrency(overAmount)
        }),
        action: t('budget.alerts.cutToStay', {
          category: cat.category,
          amount: formatCurrency(overAmount)
        })
      })
    })

    // Warning — actionable: "Reduce to X/day for remaining days"
    const maxWarnings = exceeded.length > 0 ? 1 : 2
    warning.slice(0, maxWarnings).forEach(cat => {
      const safeDaily = daysRemaining > 0 ? cat.remaining / daysRemaining : 0
      alerts.push({
        type: 'warning',
        category: cat.category,
        message: t('budget.alerts.approaching', {
          category: cat.category,
          amount: formatCurrency(cat.remaining),
          days: daysRemaining
        }),
        action: daysRemaining > 0
          ? t('budget.alerts.reduceDaily', {
              category: cat.category,
              amount: formatCurrency(safeDaily)
            })
          : undefined
      })
    })

    if (exceeded.length === 0 && warning.length === 0 && onTrack.length > 0) {
      alerts.push({
        type: 'onTrack',
        message: t('budget.alerts.allOnTrack', { count: onTrack.length })
      })
    }

    return alerts
  }

  const alerts = generateAlerts()
  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.category || 'onTrack'))

  if (visibleAlerts.length === 0) return null

  const styles = (type: AlertType) => {
    switch (type) {
      case 'exceeded': return {
        bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400', icon: XCircle
      }
      case 'warning': return {
        bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400', icon: AlertTriangle
      }
      case 'onTrack': return {
        bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400', icon: CheckCircle
      }
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {visibleAlerts.slice(0, 2).map((alert, i) => {
        const s = styles(alert.type)
        const Icon = s.icon
        return (
          <div key={alert.category || `alert-${i}`}
            className={cn('flex items-start gap-3 p-3 rounded-lg border', s.bg, s.border)}
            role="alert"
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', s.text)} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', s.text)}>{alert.message}</p>
              {alert.action && (
                <p className={cn('text-xs mt-0.5 opacity-80', s.text)}>{alert.action}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {alert.category && onViewCategory && (
                <button onClick={() => onViewCategory(alert.category!)}
                  className={cn('p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5', s.text)}
                  aria-label={t('viewDetails')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => {
                const key = alert.category || 'onTrack'
                setDismissedAlerts(prev => new Set([...prev, key]))
              }}
                className={cn('p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5', s.text)}
                aria-label={t('button.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
