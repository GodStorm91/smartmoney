import { apiClient } from './api-client'

export interface CategorySuggestion {
  transaction_id: number
  description: string
  amount: number
  current_category: string
  suggested_category: string
  confidence: number
  reason: string
  is_new_category: boolean
}

export interface CategorizeSuggestionsResponse {
  suggestions: CategorySuggestion[]
  total_other_count: number
  credits_used: number
  new_categories_suggested: string[]
}

export interface ApplySuggestionsRequest {
  approved: Array<{ transaction_id: number; category: string }>
  create_rules: boolean
}

export interface ApplySuggestionsResponse {
  updated_count: number
  rules_created: number
  failed_ids: number[]
}

/**
 * Get AI-powered categorization suggestions for 'Other' transactions
 */
export async function getCategorizationSuggestions(
  limit: number = 50,
  language: string = 'ja'
): Promise<CategorizeSuggestionsResponse> {
  const response = await apiClient.post<CategorizeSuggestionsResponse>(
    '/api/ai/categorize/suggestions',
    { limit, language }
  )
  return response.data
}

/**
 * Apply approved categorization suggestions
 */
export async function applyCategorizationSuggestions(
  request: ApplySuggestionsRequest
): Promise<ApplySuggestionsResponse> {
  const response = await apiClient.post<ApplySuggestionsResponse>(
    '/api/ai/categorize/apply',
    request
  )
  return response.data
}
