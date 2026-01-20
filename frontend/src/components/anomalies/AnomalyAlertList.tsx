import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAnomalyAlerts, deleteAnomaly, type AnomalyAlert } from '@/services/anomaly-service'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AnomalyAlertListProps {
  limit?: number
  showHeader?: boolean
  onAlertClick?: (alert: AnomalyAlert) => void
}

export function AnomalyAlertList({
  limit = 10,
  showHeader = true,
  onAlertClick,
}: AnomalyAlertListProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['anomalyAlerts', limit],
    queryFn: () => getAnomalyAlerts({ limit, unread_only: false }),
  })

  const deleteMutation = useMutation({
    mutationFn: (alertId: number) => deleteAnomaly(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalyAlerts'] })
    },
  })

  const getSeverityColor = (severity: number): 'error' | 'warning' | 'default' | 'info' | 'success' | 'purple' | undefined => {
    if (severity >= 5) return 'error'
    if (severity >= 4) return 'error'
    if (severity >= 3) return 'warning'
    return 'default'
  }

  const getSeverityLabel = (severity: number) => {
    if (severity >= 5) return t('anomaly.severity.critical')
    if (severity >= 4) return t('anomaly.severity.high')
    if (severity >= 3) return t('anomaly.severity.medium')
    return t('anomaly.severity.low')
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      large_transaction: t('anomaly.type.large_transaction'),
      category_shift: t('anomaly.type.category_shift'),
      duplicate: t('anomaly.type.duplicate'),
      recurring_change: t('anomaly.type.recurring_change'),
      ml_detected: t('anomaly.type.ml_detected'),
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('anomaly.title')}</h3>
          </div>
        )}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </Card>
        ))}
      </div>
    )
  }

  if (error || !alerts) {
    return (
      <Card className="p-4 text-center text-gray-500">
        {t('common.noData')}
      </Card>
    )
  }

  const unreadAlerts = alerts.filter((a) => !a.is_read)

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{t('anomaly.title')}</h3>
            {unreadAlerts.length > 0 && (
              <Badge variant="error">
                {unreadAlerts.length}
              </Badge>
            )}
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('anomaly.noAlerts')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`
                p-4 cursor-pointer transition-all hover:shadow-md
                ${!alert.is_read ? 'border-l-4 border-l-red-500' : 'opacity-75'}
              `}
              onClick={() => onAlertClick?.(alert)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {getSeverityLabel(alert.severity)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {getTypeLabel(alert.type)}
                    </span>
                  </div>
                  <p className="font-medium text-sm line-clamp-2">
                    {alert.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate(alert.id)
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title={t('button.delete')}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
