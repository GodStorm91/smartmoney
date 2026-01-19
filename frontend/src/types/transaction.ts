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
  category?: string
  source?: string
  type?: 'income' | 'expense' | 'all'
}

export interface DateRange {
  start: string
  end: string
}
