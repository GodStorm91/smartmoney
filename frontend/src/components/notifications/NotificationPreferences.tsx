import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, Mail, Smartphone, Settings, Check, X, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { notificationService, isPushSupported, requestNotificationPermission, getVapidPublicKey } from '@/services/notification-service'
import { cn } from '@/utils/cn'
import type { NotificationPreference } from '@/types/notification'

export function NotificationPreferences() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  // Fetch preferences
  const { data: prefsData, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationService.getPreferences,
  })

  // Update preference mutation
  const updateMutation = useMutation({
    mutationFn: ({ channel, enabled, settings }: { channel: string; enabled: boolean; settings?: Record<string, unknown> }) =>
      notificationService.updatePreference(channel, enabled, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })

  const preferences = prefsData?.preferences || []

  // Check push notification status
  useEffect(() => {
    const checkPushStatus = async () => {
      if (isPushSupported()) {
        const permission = await Notification.permission
        setPushEnabled(permission === 'granted')
      }
    }
    checkPushStatus()
  }, [])

  const handleToggleChannel = (channel: string, currentEnabled: boolean) => {
    updateMutation.mutate({
      channel,
      enabled: !currentEnabled,
    })
  }

  const handleEnablePush = async () => {
    setPushLoading(true)
    try {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        // Subscribe to push
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready
          // In a real app, you would subscribe with the VAPID key
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: getVapidPublicKey(),
          })
          await notificationService.subscribePush(subscription.toJSON())
        }
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error)
    } finally {
      setPushLoading(false)
    }
  }

  const getPreference = (channel: string): NotificationPreference | undefined =>
    preferences.find(p => p.channel === channel)

  const channels = [
    {
      id: 'push',
      icon: Smartphone,
      label: t('notifications.channels.push'),
      description: t('notifications.channels.pushDescription'),
      getEnabled: () => pushEnabled,
      onToggle: handleEnablePush,
    },
    {
      id: 'email',
      icon: Mail,
      label: t('notifications.channels.email'),
      description: t('notifications.channels.emailDescription'),
      getEnabled: () => getPreference('email')?.enabled ?? true,
      onToggle: () => handleToggleChannel('email', getPreference('email')?.enabled ?? true),
    },
    {
      id: 'in_app',
      icon: Bell,
      label: t('notifications.channels.inApp'),
      description: t('notifications.channels.inAppDescription'),
      getEnabled: () => getPreference('in_app')?.enabled ?? true,
      onToggle: () => handleToggleChannel('in_app', getPreference('in_app')?.enabled ?? true),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notification Channels */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('notifications.channels.title')}
          </h3>
        </div>

        <div className="space-y-4">
          {channels.map((channel) => {
            const Icon = channel.icon
            const enabled = channel.getEnabled()

            return (
              <div
                key={channel.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  enabled
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    enabled
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : 'bg-gray-200 dark:bg-gray-600'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5',
                      enabled
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {channel.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {channel.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={channel.onToggle}
                  disabled={channel.id === 'push' && pushLoading}
                  className={cn(
                    'relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0',
                    enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm',
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Notification Types */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          {t('notifications.types.title')}
        </h3>

        <div className="space-y-3">
          {[
            { key: 'budget_alert', label: t('notifications.types.budget') },
            { key: 'bill_reminder', label: t('notifications.types.bills') },
            { key: 'anomaly_detected', label: t('notifications.types.anomalies') },
            { key: 'goal_milestone', label: t('notifications.types.goals') },
            { key: 'savings_tip', label: t('notifications.types.savings') },
            { key: 'burn_rate_warning', label: t('notifications.types.burnRate') },
          ].map((type) => {
            const pref = getPreference(type.key)
            const enabled = pref?.enabled ?? true

            return (
              <div
                key={type.key}
                className="flex items-center justify-between py-2"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {type.label}
                </span>
                <button
                  onClick={() => handleToggleChannel(type.key, !enabled)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          {t('notifications.quietHours.title')}
        </h3>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('notifications.quietHours.description')}
            </p>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('notifications.quietHours.configure')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
