// Transaction types
export interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  currency: string  // ISO currency code (JPY, USD, VND)
  category: string
  source: string
  type: 'income' | 'expense'
  created_at: string
  account_id?: number | null
  is_transfer?: boolean  // True for transfer transactions between accounts
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
