export type NotificationChannel = 'push' | 'email' | 'in_app'

export interface NotificationPreference {
  id: number
  user_id: number
  channel: NotificationChannel
  enabled: boolean
  settings: {
    frequency_limit: number
    quiet_hours?: string
    critical_only?: boolean
  }
  created_at: string
  updated_at: string
}

export interface NotificationType {
  type: 'budget_alert' | 'bill_reminder' | 'anomaly_detected' | 'goal_milestone' | 'savings_tip' | 'burn_rate_warning'
}

export interface InAppNotification {
  id: number
  user_id: number
  type: NotificationType['type']
  title: string
  message: string
  data: {
    budget_id?: number
    category?: string
    transaction_id?: number
    bill_id?: number
    goal_id?: number
    [key: string]: unknown
  }
  priority: 1 | 2 | 3 | 4 // 1=critical, 2=high, 3=normal, 4=low
  is_read: boolean
  read_at: string | null
  action_url: string | null
  action_label: string | null
  expires_at: string | null
  created_at: string
}

export interface PushSubscription {
  id: number
  user_id: number
  endpoint: string
  p256dh: string
  auth: string
  browser: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationListResponse {
  notifications: InAppNotification[]
  total_count: number
  unread_count: number
}

export interface NotificationCountResponse {
  unread_count: number
}

export interface NotificationPreferenceResponse {
  preferences: NotificationPreference[]
}

export interface NotificationUpdateResponse {
  success: boolean
  notification: InAppNotification
}

export interface NotificationMarkAllReadResponse {
  success: boolean
  updated_count: number
}
