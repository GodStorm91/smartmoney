import { apiClient } from './api-client'
import type { Settings } from '@/types'

/**
 * Fetch app settings
 */
export async function fetchSettings(): Promise<Settings> {
  const response = await apiClient.get<Settings>('/api/settings')
  return response.data
}

/**
 * Update app settings
 */
export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  const response = await apiClient.put<Settings>('/api/settings', data)
  return response.data
}

/**
 * Fetch available categories
 */
export async function fetchCategories(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/api/settings/categories')
  return response.data
}

/**
 * Fetch available sources (payment methods)
 */
export async function fetchSources(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/api/settings/sources')
  return response.data
}
