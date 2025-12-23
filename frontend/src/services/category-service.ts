import { apiClient as api } from './api-client'
import type { UserCategory, CreateCategoryPayload } from '@/types'

export async function getCustomCategories(): Promise<UserCategory[]> {
  const { data } = await api.get('/api/categories')
  return data
}

export async function createCategory(payload: CreateCategoryPayload): Promise<UserCategory> {
  const { data } = await api.post('/api/categories', payload)
  return data
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/api/categories/${id}`)
}
