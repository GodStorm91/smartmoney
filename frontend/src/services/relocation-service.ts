import { apiClient } from './api-client'
import type { CityListItem, PostalCodeResponse, RelocationCompareRequest, RelocationCompareResponse } from '@/types/relocation'

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

/**
 * Resolve a 7-digit Japanese postal code to a city
 */
export async function resolvePostalCode(code: string): Promise<PostalCodeResponse> {
  const response = await apiClient.get<PostalCodeResponse>(
    `/api/relocation/resolve-postal?code=${code}`
  )
  return response.data
}
