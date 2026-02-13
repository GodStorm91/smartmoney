import { apiClient } from './api-client'
import type { CityListItem, RelocationCompareRequest, RelocationCompareResponse } from '@/types/relocation'

/**
 * Fetch available cities for relocation comparison
 */
export async function getCities(): Promise<CityListItem[]> {
  const response = await apiClient.get<CityListItem[]>('/api/relocation/cities')
  return response.data
}

/**
 * Compare cost of living between two cities
 */
export async function compareLocations(
  request: RelocationCompareRequest
): Promise<RelocationCompareResponse> {
  const response = await apiClient.post<RelocationCompareResponse>(
    '/api/relocation/compare',
    request
  )
  return response.data
}
