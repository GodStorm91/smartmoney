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

// Analytics types
export interface MonthlyData {
  month: string
  income: number
  expense: number
  net: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  emoji?: string
}

export interface Analytics {
  monthly_trends: MonthlyData[]
  category_breakdown: CategoryBreakdown[]
  total_income: number
  total_expense: number
  net_cashflow: number
}

// Goal types
export interface Goal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  years: 1 | 3 | 5 | 10
  start_date: string
  end_date: string
  status: 'ahead' | 'on-track' | 'behind' | 'achieved'
  monthly_required: number
}

// Upload types
export interface UploadResult {
  filename: string
  uploaded_at: string
  imported_count: number
  duplicate_count: number
  error_count: number
  errors?: UploadError[]
  status: 'success' | 'warning' | 'completed'
}

export interface UploadError {
  row: number
  message: string
}

// Settings types
export interface Settings {
  currency: string
  base_date: number
  categories: string[]
  sources: string[]
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
