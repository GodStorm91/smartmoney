import type {
  InAppNotification,
  NotificationListResponse,
  NotificationCountResponse,
  NotificationPreference,
  NotificationPreferenceResponse,
  PushSubscription,
} from '@/types/notification'
import { apiClient } from '@/services/api-client'

export const notificationService = {
  // Get all notifications with pagination
  async getNotifications(params?: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
    type?: string
  }): Promise<NotificationListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.unreadOnly) queryParams.append('unread_only', 'true')
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.offset) queryParams.append('offset', String(params.offset))
    if (params?.type) queryParams.append('type', params.type)

    const response = await apiClient.get<NotificationListResponse>(
      `/api/notifications?${queryParams}`
    )
    return response.data
  },

  // Get unread notification count
  async getUnreadCount(): Promise<NotificationCountResponse> {
    const response = await apiClient.get<NotificationCountResponse>(
      '/api/notifications/unread/count'
    )
    return response.data
  },

  // Mark a notification as read
  async markAsRead(notificationId: number): Promise<{ success: boolean; notification: InAppNotification }> {
    const response = await apiClient.put<{ success: boolean; notification: InAppNotification }>(
      `/api/notifications/${notificationId}/read`,
      {}
    )
    return response.data
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ success: boolean; updated_count: number }> {
    const response = await apiClient.put<{ success: boolean; updated_count: number }>(
      '/api/notifications/read-all',
      {}
    )
    return response.data
  },

  // Delete a notification
  async deleteNotification(notificationId: number): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/notifications/${notificationId}`
    )
    return response.data
  },

  // Cleanup old notifications
  async cleanupOldNotifications(daysOld: number = 30): Promise<{ success: boolean; deleted_count: number }> {
    const response = await apiClient.post<{ success: boolean; deleted_count: number }>(
      '/api/notifications/cleanup',
      { days_old: daysOld }
    )
    return response.data
  },

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferenceResponse> {
    const response = await apiClient.get<NotificationPreferenceResponse>(
      '/api/notifications/preferences'
    )
    return response.data
  },

  // Update notification preference for a channel
  async updatePreference(
    channel: string,
    enabled: boolean,
    settings?: Record<string, unknown>
  ): Promise<{ success: boolean; preference: NotificationPreference }> {
    const response = await apiClient.put<{ success: boolean; preference: NotificationPreference }>(
      `/api/notifications/preferences/${channel}`,
      { enabled, settings }
    )
    return response.data
  },

  // Subscribe to push notifications
  async subscribePush(subscription: PushSubscriptionInit): Promise<{ success: boolean; subscription: PushSubscription }> {
    const response = await apiClient.post<{ success: boolean; subscription: PushSubscription }>(
      '/api/notifications/push/subscribe',
      subscription
    )
    return response.data
  },

  // Unsubscribe from push notifications
  async unsubscribePush(): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/notifications/push/unsubscribe',
      {}
    )
    return response.data
  },
}

// Helper function to check if push notifications are supported
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// Helper function to request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied'
  return await Notification.requestPermission()
}

// Helper to get VAPID public key (should come from backend config)
export function getVapidPublicKey(): string {
  // This should be fetched from the server or environment
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
}
