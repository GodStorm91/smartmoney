export interface CategoryChild {
  id: number
  name: string
  icon: string
  is_system: boolean
}

export interface CategoryParent {
  id: number
  name: string
  icon: string
  type: 'expense' | 'income'
  children: CategoryChild[]
}

export interface CategoryTree {
  expense: CategoryParent[]
  income: CategoryParent[]
}

export interface CreateCategoryRequest {
  name: string
  icon: string
  parent_id: number
  type: 'expense' | 'income'
}
