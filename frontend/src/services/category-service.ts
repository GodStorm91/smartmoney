import { apiClient as api } from './api-client'
import type { CategoryTree, CreateCategoryRequest, CategoryChild } from '@/types/category'

// Legacy type for backward compatibility
import type { UserCategory, CreateCategoryPayload } from '@/types'

export async function getCategoryTree(): Promise<CategoryTree> {
  const { data } = await api.get('/api/categories')
  return data
}

export async function createCategory(payload: CreateCategoryRequest): Promise<CategoryChild> {
  const { data } = await api.post('/api/categories', payload)
  return data
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/api/categories/${id}`)
}

// Legacy functions for backward compatibility with old user-categories
export async function getCustomCategories(): Promise<UserCategory[]> {
  const { data } = await api.get('/api/user-categories')
  return data
}

export async function createUserCategory(payload: CreateCategoryPayload): Promise<UserCategory> {
  const { data } = await api.post('/api/user-categories', payload)
  return data
}

export async function deleteUserCategory(id: number): Promise<void> {
  await api.delete(`/api/user-categories/${id}`)
}
