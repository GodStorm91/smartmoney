import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomCategories, createCategory, deleteCategory } from '@/services/category-service'
import type { CreateCategoryPayload } from '@/types'

export function useCustomCategories() {
  return useQuery({
    queryKey: ['custom-categories'],
    queryFn: getCustomCategories,
    staleTime: 5 * 60 * 1000, // 5 min
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] })
    },
  })
}
