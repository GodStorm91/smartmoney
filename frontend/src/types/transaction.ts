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
  is_adjustment?: boolean  // True for balance adjustments (excluded from budget)
  receipt_url?: string | null  // Receipt image URL
  transfer_type?: string | null  // outgoing, incoming, fee, proxy_expense, proxy_settled, etc.
}

// Filter types
export interface TransactionFilters {
  start_date?: string
  end_date?: string
  categories?: string[]
  source?: string
  type?: 'income' | 'expense' | 'all'
  search?: string
  min_amount?: number
  max_amount?: number
  account_id?: number
}

export interface DateRange {
  start: string
  end: string
}
