import { apiClient } from './api-client'

export interface AnomalyAlert {
  id: number
  type: string
  severity: number
  transaction_id: number | null
  category: string | null
  description: string
  data: Record<string, unknown> | null
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  expires_at: string | null
}

export interface AnomalyConfig {
  user_id: number
  sensitivity: 'low' | 'medium' | 'high'
  large_transaction_threshold: number
  unusual_spending_percent: number
  recurring_change_percent: number
  duplicate_charge_hours: number
  notification_channels: string[] | null
  enabled_types: string[] | null
  created_at: string
  updated_at: string
}

export interface AnomalyConfigUpdate {
  sensitivity?: 'low' | 'medium' | 'high'
  large_transaction_threshold?: number
  unusual_spending_percent?: number
  recurring_change_percent?: number
  duplicate_charge_hours?: number
  enabled_types?: string[]
}

export interface UnreadCount {
  count: number
}

export async function getAnomalyAlerts(params?: {
  limit?: number
  unread_only?: boolean
  severity?: number[]
  types?: string[]
}): Promise<AnomalyAlert[]> {
  const response = await apiClient.get<AnomalyAlert[]>('/api/anomalies', {
    params: params,
  })
  return response.data
}

export async function getAnomalyConfig(): Promise<AnomalyConfig> {
  const response = await apiClient.get<AnomalyConfig>('/api/anomalies/config')
  return response.data
}

export async function updateAnomalyConfig(data: AnomalyConfigUpdate): Promise<AnomalyConfig> {
  const response = await apiClient.put<AnomalyConfig>('/api/anomalies/config', data)
  return response.data
}

export async function acknowledgeAnomaly(
  alertId: number,
  feedback?: { is_useful: boolean; feedback?: string }
): Promise<void> {
  await apiClient.post(`/api/anomalies/${alertId}/acknowledge`, feedback)
}

export async function deleteAnomaly(alertId: number): Promise<void> {
  await apiClient.delete(`/api/anomalies/${alertId}`)
}

export async function triggerAnomalyScan(): Promise<{ message: string; anomalies_count: number }> {
  const response = await apiClient.post<{ message: string; anomalies_count: number }>(
    '/api/anomalies/scan'
  )
  return response.data
}

export async function getUnreadAnomalyCount(): Promise<UnreadCount> {
  const response = await apiClient.get<UnreadCount>('/api/anomalies/unread/count')
  return response.data
}
