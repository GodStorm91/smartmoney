export interface UserCategory {
  id: number
  name: string
  icon: string
  type: 'expense' | 'income'
}

export interface CreateCategoryPayload {
  name: string
  icon: string
  type: 'expense' | 'income'
}
