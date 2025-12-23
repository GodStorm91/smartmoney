// Transaction types
export interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  category: string
  source: string
  type: 'income' | 'expense'
  created_at: string
}

// Filter types
export interface TransactionFilters {
  start_date?: string
  end_date?: string
  categories?: string[]
  source?: string
  type?: 'income' | 'expense' | 'all'
  search?: string
}

export interface DateRange {
  start: string
  end: string
}
