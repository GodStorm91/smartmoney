import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

interface AlertItem {
  type: string
  message: string
}

interface DashboardAlertsProps {
  alerts: AlertItem[]
  unreadAnomalyCount?: number
}

export function DashboardAlerts({ alerts, unreadAnomalyCount }: DashboardAlertsProps) {
  const { t } = useTranslation('common')

  const hasAlerts = alerts.length > 0
  const hasAnomalies = unreadAnomalyCount && unreadAnomalyCount > 0

  if (!hasAlerts && !hasAnomalies) return null

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
                alert.type === 'danger'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}
            >
              <Bell className="w-3.5 h-3.5" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Anomaly Alerts */}
      {hasAnomalies && (
        <a href="/settings?section=anomaly">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <Bell className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {t('anomaly.title')}
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">
                {unreadAnomalyCount} {unreadAnomalyCount === 1 ? 'alert' : 'alerts'} detected
              </p>
            </div>
            <Badge variant="error">{unreadAnomalyCount}</Badge>
          </div>
        </a>
      )}
    </div>
  )
}
