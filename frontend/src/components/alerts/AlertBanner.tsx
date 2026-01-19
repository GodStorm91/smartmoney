import { useTranslation } from 'react-i18next'
import { AlertTriangle, Info, X, TrendingUp, CreditCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { cn } from '@/utils/cn'
import type { BudgetAlert } from '@/types'

interface AlertBannerProps {
  onDismiss?: (alertId: string | number) => void
  onViewDetails?: (alert: BudgetAlert) => void
  className?: string
}

export function AlertBanner({ onDismiss, onViewDetails, className }: AlertBannerProps) {
  const { t } = useTranslation('common')
  const { alerts, markAsRead } = useBudgetAlerts()
  const [visibleAlerts, setVisibleAlerts] = useState<BudgetAlert[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const unread = alerts.filter(
      alert => !alert.is_read && !dismissedIds.has(alert.id)
    )
    setVisibleAlerts(unread.slice(0, 3))
  }, [alerts, dismissedIds])

  const handleDismiss = (alertId: number) => {
    setDismissedIds(prev => new Set([...prev, alertId]))
    onDismiss?.(alertId)
    markAsRead.mutate(alertId)
  }

  const getAlertIcon = (alert: BudgetAlert) => {
    switch (alert.alert_type) {
      case 'over_budget':
        return <TrendingUp className="w-5 h-5 text-red-500" />
      case 'threshold_80':
      case 'threshold_100':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'threshold_50':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getAlertStyles = (alert: BudgetAlert) => {
    switch (alert.alert_type) {
      case 'over_budget':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'threshold_80':
      case 'threshold_100':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'threshold_50':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  const getAlertMessage = (alert: BudgetAlert) => {
    switch (alert.alert_type) {
      case 'over_budget':
        return t('alerts.over_budget.title')
      case 'threshold_80':
        return t('alerts.threshold_80.title')
      case 'threshold_50':
        return t('alerts.threshold_50.title')
      default:
        return t('alerts.title')
    }
  }

  const getAlertDescription = (alert: BudgetAlert) => {
    const amount = alert.current_spending
    const budget = alert.budget_amount
    const percentage = alert.threshold_percentage

    switch (alert.alert_type) {
      case 'over_budget':
        return t('alerts.over_budget.message', {
          budget: alert.budget_name || alert.category || t('alerts.budget_progress.default'),
          amount: `$${amount.toFixed(2)}`
        })
      case 'threshold_80':
      case 'threshold_100':
        return t('alerts.threshold_80.message', {
          budget: alert.budget_name || alert.category || t('alerts.budget_progress.default'),
          percentage: percentage
        })
      case 'threshold_50':
        return t('alerts.threshold_50.message', {
          budget: alert.budget_name || alert.category || t('alerts.budget_progress.default'),
          percentage: percentage
        })
      default:
        return alert.message || t('alerts.default.message')
    }
  }

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {visibleAlerts.map(alert => (
        <Card
          key={alert.id}
          className={cn(
            'p-4 border-l-4',
            getAlertStyles(alert),
            'animate-fade-in'
          )}
        >
          <div className="flex items-start gap-3">
            {getAlertIcon(alert)}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {alert.title || getAlertMessage(alert)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {getAlertDescription(alert)}
              </p>
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(alert)}
                  className="text-sm text-primary-500 hover:text-primary-600 mt-2 inline-block"
                >
                  {t('alerts.view_details')}
                </button>
              )}
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}
