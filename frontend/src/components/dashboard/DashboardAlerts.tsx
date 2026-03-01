import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Bell, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

// Semantic color mapping for alert severity
const DANGER_BG = 'bg-expense-100 text-expense-700 dark:bg-expense-900/30 dark:text-expense-400'
const WARNING_BG = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'

interface AlertItem {
  type: string
  message: string
}

export interface BudgetAlertItem {
  id: number
  category: string
  alert_type: string
  threshold_percentage: number
  current_spending: number
  budget_amount: number
  amount_remaining: number
  is_read: boolean
}

interface DashboardAlertsProps {
  alerts: AlertItem[]
  unreadAnomalyCount?: number
  budgetAlerts?: BudgetAlertItem[]
  onDismissBudgetAlert?: (alertId: number) => void
}

export function DashboardAlerts({ alerts, unreadAnomalyCount, budgetAlerts = [], onDismissBudgetAlert }: DashboardAlertsProps) {
  const { t } = useTranslation('common')

  const hasAlerts = alerts.length > 0
  const hasAnomalies = unreadAnomalyCount && unreadAnomalyCount > 0
  const hasBudgetAlerts = budgetAlerts.length > 0

  if (!hasAlerts && !hasAnomalies && !hasBudgetAlerts) return null

  const isOverBudget = (type: string) => type === 'threshold_100' || type === 'over_budget'

  return (
    <div className="space-y-2">
      {/* Smart Alerts */}
      {hasAlerts && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5',
                alert.type === 'danger' ? DANGER_BG : WARNING_BG
              )}
            >
              <Bell className="w-3.5 h-3.5" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Budget Alerts */}
      {hasBudgetAlerts && (
        <div className="space-y-2">
          {budgetAlerts.map((alert, idx) => {
            const pct = alert.budget_amount > 0
              ? Math.round((alert.current_spending / alert.budget_amount) * 100)
              : 0
            const over = isOverBudget(alert.alert_type)
            return (
              <Link key={alert.id} to="/budget" className="block animate-stagger-in" style={{ '--stagger-index': idx } as React.CSSProperties}>
                <div className={cn(
                  'p-3 rounded-xl border transition-colors',
                  over
                    ? 'bg-expense-50 dark:bg-expense-900/20 border-expense-200 dark:border-expense-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn(
                      'text-xs font-semibold',
                      over ? 'text-expense-700 dark:text-expense-300' : 'text-amber-700 dark:text-amber-300'
                    )}>
                      {t('alerts.budgetWarning', '{{category}}: {{pct}}% spent', { category: alert.category, pct })}
                    </span>
                    {onDismissBudgetAlert && (
                      <button
                        onClick={(e) => { e.preventDefault(); onDismissBudgetAlert(alert.id) }}
                        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                        aria-label={t('alerts.dismiss', 'Dismiss alert')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        over ? 'bg-expense-500' : 'bg-amber-500'
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className={cn(
                    'text-[10px] mt-1',
                    over ? 'text-expense-500 dark:text-expense-400' : 'text-amber-500 dark:text-amber-400'
                  )}>
                    {t('alerts.budgetRemaining', '{{amount}} remaining', { amount: alert.amount_remaining.toFixed(0) })}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Anomaly Alerts */}
      {hasAnomalies && (
        <Link to="/settings" search={{ section: 'anomaly' }}>
          <div className="flex items-center gap-3 p-3 bg-expense-50 dark:bg-expense-900/20 border border-expense-200 dark:border-expense-800 rounded-xl cursor-pointer hover:bg-expense-100 dark:hover:bg-expense-900/30 transition-colors">
            <div className="p-2 bg-expense-100 dark:bg-expense-900/50 rounded-xl">
              <Bell className="w-4 h-4 text-expense-600 dark:text-expense-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-expense-700 dark:text-expense-300">
                {t('anomaly.title')}
              </p>
              <p className="text-xs text-expense-500 dark:text-expense-400">
                {t('anomaly.alertsDetected', '{{count}} alerts detected', { count: unreadAnomalyCount })}
              </p>
            </div>
            <Badge variant="error">{unreadAnomalyCount}</Badge>
          </div>
        </Link>
      )}
    </div>
  )
}
