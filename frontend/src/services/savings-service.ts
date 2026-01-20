import { apiClient } from './api-client'

export interface SavingsRecommendation {
  id: number
  category: string
  recommendation: string
  potential_savings: number
  action_type: string
  status: string
  action_data: Record<string, unknown> | null
  created_at: string
  applied_at: string | null
  dismissed_at: string | null
}

export interface SavingsPotential {
  total_potential: number
  by_category: Record<string, number>
  by_action_type: Record<string, number>
  top_recommendations: Array<{
    id: number
    category: string
    recommendation: string
    potential_savings: number
  }>
  pending_count: number
}

export interface UnreadCount {
  count: number
}

export async function getSavingsRecommendations(params?: {
  limit?: number
  status?: string
}): Promise<SavingsRecommendation[]> {
  const response = await apiClient.get<SavingsRecommendation[]>('/api/savings/recommendations', {
    params: params,
  })
  return response.data
}

export async function getRecommendationDetails(
  recommendationId: number
): Promise<SavingsRecommendation> {
  const response = await apiClient.get<SavingsRecommendation>(
    `/api/savings/recommendations/${recommendationId}`
  )
  return response.data
}

export async function applyRecommendation(
  recommendationId: number
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/api/savings/recommendations/${recommendationId}/apply`
  )
  return response.data
}

export async function dismissRecommendation(
  recommendationId: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.put<{ success: boolean; message: string }>(
    `/api/savings/recommendations/${recommendationId}/dismiss`,
    { reason }
  )
  return response.data
}

export async function getSavingsPotential(): Promise<SavingsPotential> {
  const response = await apiClient.get<SavingsPotential>('/api/savings/potential')
  return response.data
}

export async function getUnreadSavingsCount(): Promise<UnreadCount> {
  const response = await apiClient.get<UnreadCount>('/api/savings/unread/count')
  return response.data
}

export async function generateRecommendations(): Promise<{
  message: string
  count: number
  total_potential: number
}> {
  const response = await apiClient.post<{
    message: string
    count: number
    total_potential: number
  }>('/api/savings/generate')
  return response.data
}

export async function getLiveRecommendations(limit?: number): Promise<{
  recommendations: Array<{
    category: string
    recommendation: string
    potential_savings: number
    action_type: string
    action_data?: Record<string, unknown>
  }>
  count: number
  total_potential: number
}> {
  const response = await apiClient.get<{
    recommendations: Array<{
      category: string
      recommendation: string
      potential_savings: number
      action_type: string
      action_data?: Record<string, unknown>
    }>
    count: number
    total_potential: number
  }>('/api/savings/live', { params: { limit } })
  return response.data
}
