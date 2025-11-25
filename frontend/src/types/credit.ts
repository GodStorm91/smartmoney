/**
 * Credit system TypeScript types
 */

export type PackageType = 'starter' | 'basic' | 'standard' | 'premium'
export type PaymentMethod = 'bank_transfer' | 'qr_code'
export type TransactionType = 'purchase' | 'usage' | 'refund' | 'adjustment'

export interface CreditBalance {
  user_id: number
  balance: number
  lifetime_purchased: number
  lifetime_spent: number
  last_purchase_date: string | null
  last_transaction_date: string | null
}

export interface PurchaseRequest {
  package: PackageType
  payment_method: PaymentMethod
  return_url?: string
}

export interface BankAccountInfo {
  bank_name: string
  account_number: string
  account_name: string
  transfer_content: string
}

export interface PurchaseResponse {
  purchase_id: string
  package: PackageType
  amount_vnd: number
  credits: number
  payment_url: string
  qr_code: string
  bank_account: BankAccountInfo
  expires_at: string
  status: string
}

export interface CreditTransaction {
  id: string
  type: TransactionType
  amount: number
  balance_after: number
  description: string
  reference_id: string | null
  extra_data: Record<string, any> | null
  created_at: string
}

export interface TransactionHistory {
  total: number
  page: number
  per_page: number
  pages: number
  transactions: CreditTransaction[]
}
