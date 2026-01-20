import { apiClient } from './api-client'

export interface InsightCard {
  id: number
  type: string
  title: string
  message: string
  priority: number
  data: Record<string, unknown>
  action_url: string | null
  action_label: string | null
  is_read: boolean
  created_at: string
  expires_at: string | null
}

export interface LiveInsight {
  type: string
  title: string
  message: string
  priority: number
  data: Record<string, unknown>
  action_url?: string
  action_label?: string
}

export interface UnreadCount {
  count: number
}

export async function getInsights(params?: {
  limit?: number
  unread_only?: boolean
  types?: string[]
}): Promise<InsightCard[]> {
  const response = await apiClient.get<InsightCard[]>('/api/insights', {
    params: params,
  })
  return response.data
}

export async function getInsightDetails(insightId: number): Promise<InsightCard> {
  const response = await apiClient.get<InsightCard>(`/api/insights/${insightId}`)
  return response.data
}

export async function dismissInsight(insightId: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.put<{ success: boolean; message: string }>(
    `/api/insights/${insightId}/dismiss`
  )
  return response.data
}

export async function markInsightRead(insightId: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.put<{ success: boolean; message: string }>(
    `/api/insights/${insightId}/read`
  )
  return response.data
}

export async function refreshInsights(force?: boolean): Promise<{ message: string; count: number; insights: LiveInsight[] }> {
  const response = await apiClient.post<{ message: string; count: number; insights: LiveInsight[] }>(
    '/api/insights/refresh',
    null,
    { params: { force } }
  )
  return response.data
}

export async function getUnreadInsightCount(): Promise<UnreadCount> {
  const response = await apiClient.get<UnreadCount>('/api/insights/unread/count')
  return response.data
}

export async function getLiveInsights(limit?: number): Promise<{ insights: LiveInsight[]; count: number }> {
  const response = await apiClient.get<{ insights: LiveInsight[]; count: number }>('/api/insights/live', {
    params: { limit },
  })
  return response.data
}
