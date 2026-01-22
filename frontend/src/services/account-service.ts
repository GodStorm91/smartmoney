import { apiClient } from './api-client'
import type { Account, AccountWithBalance, AccountCreate, AccountUpdate } from '@/types'

/**
 * Fetch all accounts with balances
 */
export async function fetchAccounts(params?: {
  includeInactive?: boolean
}): Promise<AccountWithBalance[]> {
  const queryParams = new URLSearchParams()
  if (params?.includeInactive) {
    queryParams.append('include_inactive', 'true')
  }

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
  const url = `/api/accounts/${queryString}`
  const response = await apiClient.get<AccountWithBalance[]>(url)
  return response.data
}

/**
 * Fetch single account by ID with balance
 */
export async function fetchAccount(id: number): Promise<AccountWithBalance> {
  const response = await apiClient.get<AccountWithBalance>(`/api/accounts/${id}`)
  return response.data
}

/**
 * Create new account
 */
export async function createAccount(data: AccountCreate): Promise<Account> {
  const response = await apiClient.post<Account>('/api/accounts/', data)
  return response.data
}

/**
 * Update existing account
 */
export async function updateAccount(id: number, data: AccountUpdate): Promise<Account> {
  const response = await apiClient.patch<Account>(`/api/accounts/${id}`, data)
  return response.data
}

/**
 * Delete account (soft delete - sets is_active=false)
 */
export async function deleteAccount(id: number): Promise<void> {
  await apiClient.delete(`/api/accounts/${id}`)
}

/**
 * Fetch transactions for a specific account
 */
export async function fetchAccountTransactions(id: number): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/api/accounts/${id}/transactions`)
  return response.data
}
