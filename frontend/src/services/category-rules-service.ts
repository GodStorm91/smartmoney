/**
 * Service for category rules API calls
 */
import { apiClient } from './api-client'

export type MatchType = 'contains' | 'starts_with' | 'exact'

export interface CategoryRule {
  id: number
  keyword: string
  category: string
  match_type: MatchType
  priority: number
  is_active: boolean
  created_at: string
}

export interface CategoryRuleCreate {
  keyword: string
  category: string
  match_type?: MatchType
  priority?: number
}

export interface CategoryRuleUpdate {
  keyword?: string
  category?: string
  match_type?: MatchType
  priority?: number
  is_active?: boolean
}

interface RuleListResponse {
  rules: CategoryRule[]
  total: number
}

export interface ApplyRulesResponse {
  affected_count: number
  preview?: Array<{
    id: number
    description: string
    old_category: string
    new_category: string
  }>
}

export interface RuleSuggestion {
  keyword: string
  full_description: string
  suggested_category: string
  count: number
}

interface SuggestRulesResponse {
  suggestions: RuleSuggestion[]
}

/**
 * Fetch all category rules for current user
 */
export async function fetchCategoryRules(): Promise<CategoryRule[]> {
  const response = await apiClient.get<RuleListResponse>('/api/category-rules/')
  return response.data.rules
}

/**
 * Create a new category rule
 */
export async function createCategoryRule(
  data: CategoryRuleCreate
): Promise<CategoryRule> {
  const response = await apiClient.post<CategoryRule>('/api/category-rules/', data)
  return response.data
}

/**
 * Update an existing category rule
 */
export async function updateCategoryRule(
  id: number,
  data: CategoryRuleUpdate
): Promise<CategoryRule> {
  const response = await apiClient.patch<CategoryRule>(
    `/api/category-rules/${id}`,
    data
  )
  return response.data
}

/**
 * Delete a category rule
 */
export async function deleteCategoryRule(id: number): Promise<void> {
  await apiClient.delete(`/api/category-rules/${id}`)
}

/**
 * Apply rules to existing 'Other' transactions
 */
export async function applyRulesToTransactions(
  dryRun: boolean = true
): Promise<ApplyRulesResponse> {
  const response = await apiClient.post<ApplyRulesResponse>(
    '/api/category-rules/apply',
    { dry_run: dryRun }
  )
  return response.data
}

/**
 * Get suggested rules based on 'Other' transactions
 */
export async function suggestCategoryRules(): Promise<RuleSuggestion[]> {
  const response = await apiClient.get<SuggestRulesResponse>(
    '/api/category-rules/suggest'
  )
  return response.data.suggestions
}

/**
 * Seed default rules for current user
 */
export async function seedDefaultRules(): Promise<{ created: number; message: string }> {
  const response = await apiClient.post<{ created: number; message: string }>(
    '/api/category-rules/seed-defaults'
  )
  return response.data
}
