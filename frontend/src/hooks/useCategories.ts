import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategoryTree,
  createCategory,
  deleteCategory,
  getCustomCategories,
  createUserCategory,
  deleteUserCategory,
} from '@/services/category-service'
import type { CreateCategoryRequest } from '@/types/category'
import type { CreateCategoryPayload } from '@/types'

// New hierarchical category tree hook
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: getCategoryTree,
    staleTime: 5 * 60 * 1000, // 5 min cache
  })
}

// Create custom child category under a parent
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// Delete custom category
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryId: number) => deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// Legacy hooks for backward compatibility with old user-categories
export function useCustomCategories() {
  return useQuery({
    queryKey: ['custom-categories'],
    queryFn: getCustomCategories,
    staleTime: 5 * 60 * 1000, // 5 min
  })
}

export function useCreateUserCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createUserCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] })
    },
  })
}

export function useDeleteUserCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteUserCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] })
    },
  })
}
