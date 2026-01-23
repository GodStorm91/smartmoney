import { useState, useRef, useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, Check, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { NotificationItem } from './NotificationItem'
import { notificationService } from '@/services/notification-service'
import { cn } from '@/utils/cn'
import type { InAppNotification } from '@/types/notification'

interface NotificationCenterProps {
  onClose: () => void
  onViewAll?: () => void
}

export function NotificationCenter({ onClose, onViewAll }: NotificationCenterProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  // Fetch notifications with infinite query
  const {
    data: notificationsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications', activeTab],
    queryFn: ({ pageParam = 1 }) => notificationService.getNotifications({
      page: pageParam,
      unreadOnly: activeTab === 'unread',
      limit: 20,
    }),
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 20) {
        return (lastPage[lastPage.length - 1]?.id ?? 0) - 1
      }
      return undefined
    },
  })

  // Fetch unread count for badge
  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: notificationService.getUnreadCount,
  })

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const notifications = notificationsData?.notifications || []
  const unreadCount = countData?.unread_count || 0

  const handleNotificationAction = (notification: InAppNotification) => {
    // Navigate based on notification type
    if (notification.data.budget_id) {
      window.location.href = `/budget?id=${notification.data.budget_id}`
    } else if (notification.data.bill_id) {
      window.location.href = `/bills?id=${notification.data.bill_id}`
    } else if (notification.data.transaction_id) {
      window.location.href = `/transactions?id=${notification.data.transaction_id}`
    }
    onClose()
  }

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute right-0 top-full mt-2 w-96 max-h-[70vh]',
        'bg-white dark:bg-gray-800',
        'rounded-xl shadow-xl border border-gray-200 dark:border-gray-700',
        'overflow-hidden z-50 animate-fade-in'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('notifications.title')}
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="text-xs h-8 px-2"
          >
            <Check className="w-3 h-3 mr-1" />
            {t('notifications.markAllRead')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex-1 py-2 text-sm font-medium transition-colors',
            activeTab === 'all'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
        >
          {t('notifications.all')}
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={cn(
            'flex-1 py-2 text-sm font-medium transition-colors',
            activeTab === 'unread'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
        >
          {t('notifications.unread')}
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
              {activeTab === 'unread'
                ? t('notifications.noUnread')
                : t('notifications.empty')}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onAction={handleNotificationAction}
                onDismiss={(id) => {
                  // Handle dismiss - could call delete API
                  console.log('Dismiss notification:', id)
                }}
              />
            ))}

            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full"
              >
                {isFetchingNextPage ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  t('notifications.loadMore')
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {onViewAll && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className="w-full"
          >
            {t('notifications.viewAll')}
          </Button>
        </div>
      )}
    </div>
  )
}
