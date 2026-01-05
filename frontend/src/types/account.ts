// Account types
export type AccountType = 'bank' | 'cash' | 'credit_card' | 'investment' | 'receivable' | 'savings' | 'crypto' | 'other'

export interface Account {
  id: number
  name: string
  type: AccountType
  initial_balance: number
  initial_balance_date: string
  is_active: boolean
  currency: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AccountWithBalance extends Account {
  current_balance: number
  transaction_count: number
}

export interface AccountCreate {
  name: string
  type: AccountType
  initial_balance: number
  initial_balance_date: string
  currency?: string
  notes?: string
}

export interface AccountUpdate {
  name?: string
  type?: AccountType
  is_active?: boolean
  notes?: string
  initial_balance?: number  // For accounts with no transactions
  initial_balance_date?: string
  desired_current_balance?: number  // For accounts with transactions (triggers adjustment)
}
