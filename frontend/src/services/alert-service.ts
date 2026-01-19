import type { BudgetAlert, BudgetThresholdStatus } from '@/types'
import { apiClient } from '@/services/api-client'

export const alertService = {
  async getAlerts(params?: { unreadOnly?: boolean; limit?: number }): Promise<{ alerts: BudgetAlert[]; total_count: number; unread_count: number }> {
    const queryParams = new URLSearchParams()
    if (params?.unreadOnly) queryParams.append('unread_only', 'true')
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const response = await apiClient.get<{ alerts: BudgetAlert[]; total_count: number; unread_count: number }>(`/api/budgets/alerts?${queryParams}`)
    return response.data
  },

  async markAsRead(alertId: number): Promise<BudgetAlert> {
    const response = await apiClient.post<BudgetAlert>(`/api/budgets/alerts/${alertId}/read`, {})
    return response.data
  },

  async markAllAsRead(): Promise<{ success: boolean; updated_count: number }> {
    const response = await apiClient.put<{ success: boolean; updated_count: number }>('/api/budgets/alerts/read-all', {})
    return response.data
  },

  async getThresholdStatus(budgetId: number): Promise<BudgetThresholdStatus> {
    const response = await apiClient.get<BudgetThresholdStatus>(`/api/budgets/${budgetId}/threshold-status`)
    return response.data
  },
}
