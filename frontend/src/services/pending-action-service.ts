import { apiClient } from './api-client'
import type { PendingActionListResponse, ActionExecuteResponse } from '@/types/pending-action'

export async function fetchPendingActions(surface?: string): Promise<PendingActionListResponse> {
  const response = await apiClient.get<PendingActionListResponse>('/api/actions/pending', {
    params: surface ? { surface } : undefined,
  })
  return response.data
}

export async function fetchActionCount(): Promise<{ count: number }> {
  const response = await apiClient.get<{ count: number }>('/api/actions/count')
  return response.data
}

export async function executeAction(actionId: number): Promise<ActionExecuteResponse> {
  const response = await apiClient.post<ActionExecuteResponse>(`/api/actions/${actionId}/execute`)
  return response.data
}

export async function dismissAction(actionId: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/api/actions/${actionId}/dismiss`
  )
  return response.data
}

export async function undoAction(actionId: number): Promise<ActionExecuteResponse> {
  const response = await apiClient.post<ActionExecuteResponse>(`/api/actions/${actionId}/undo`)
  return response.data
}
