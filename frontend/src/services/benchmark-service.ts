import { apiClient } from './api-client'
import type {
  HouseholdProfile,
  BenchmarkComparison,
  NationalAveragesResponse,
} from '@/types/benchmark'

/**
 * Get user's household profile
 */
export async function getHouseholdProfile(): Promise<HouseholdProfile | null> {
  const response = await apiClient.get<HouseholdProfile | null>('/api/user/household-profile')
  return response.data
}

/**
 * Update user's household profile
 */
export async function updateHouseholdProfile(profile: HouseholdProfile): Promise<HouseholdProfile> {
  const response = await apiClient.put<HouseholdProfile>('/api/user/household-profile', profile)
  return response.data
}

/**
 * Get benchmark comparison (user's spending vs national average)
 */
export async function getBenchmarkComparison(): Promise<BenchmarkComparison> {
  const response = await apiClient.get<BenchmarkComparison>('/api/benchmarks/comparison')
  return response.data
}

/**
 * Get national averages with optional filters
 */
export async function getNationalAverages(params?: {
  prefecture_code?: string
  household_size?: number
  income_quintile?: number
}): Promise<NationalAveragesResponse> {
  const response = await apiClient.get<NationalAveragesResponse>('/api/benchmarks/national-averages', {
    params,
  })
  return response.data
}
