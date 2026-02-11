import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  TrendingUp,
  Target,
  PiggyBank,
  Flame,
  X,
  Check,
  ExternalLink,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { InAppNotification } from '@/types/notification'
import { notificationService } from '@/services/notification-service'
import { getLocaleTag } from '@/utils/formatDate'

interface NotificationItemProps {
  notification: InAppNotification
  onDismiss?: (id: number) => void
  onAction?: (notification: InAppNotification) => void
}

export function NotificationItem({ notification, onDismiss, onAction }: NotificationItemProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  const handleAction = () => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id)
    }
    if (notification.action_url) {
      window.location.href = notification.action_url
    } else {
      onAction?.(notification)
    }
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'budget_alert':
        return <TrendingUp className="w-5 h-5 text-orange-500" />
      case 'bill_reminder':
        return <Bell className="w-5 h-5 text-blue-500" />
      case 'anomaly_detected':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'goal_milestone':
        return <Target className="w-5 h-5 text-green-500" />
      case 'savings_tip':
        return <PiggyBank className="w-5 h-5 text-emerald-500" />
      case 'burn_rate_warning':
        return <Flame className="w-5 h-5 text-red-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getStyles = () => {
    if (notification.priority === 1) {
      // Critical - red
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        iconBg: 'bg-red-100 dark:bg-red-900/50',
      }
    }
    if (notification.priority === 2) {
      // High - orange
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        iconBg: 'bg-orange-100 dark:bg-orange-900/50',
      }
    }
    // Normal - default
    return {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      iconBg: 'bg-gray-100 dark:bg-gray-700',
    }
  }

  const styles = getStyles()

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('notifications.justNow')
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays })
    return date.toLocaleDateString(getLocaleTag())
  }

  return (
    <Card
      className={cn(
        'p-4 border-l-4 transition-all hover:shadow-md',
        styles.bg,
        styles.border,
        !notification.is_read && 'ring-1 ring-primary-500'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg flex-shrink-0', styles.iconBg)}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-medium',
                notification.is_read
                  ? 'text-gray-600 dark:text-gray-400'
                  : 'text-gray-900 dark:text-gray-100'
              )}>
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!notification.is_read && (
                <span className="w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(notification.created_at)}
            </span>

            <div className="flex items-center gap-2">
              {notification.action_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAction}
                  className="text-xs h-7 px-2"
                >
                  {notification.action_label || t('notifications.view')}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}

              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsReadMutation.mutate(notification.id)}
                  className="text-xs h-7 px-2"
                  disabled={markAsReadMutation.isPending}
                >
                  <Check className="w-3 h-3 mr-1" />
                  {t('notifications.markRead')}
                </Button>
              )}

              <button
                onClick={() => onDismiss?.(notification.id)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
