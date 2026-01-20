// Settings types
export interface Settings {
  currency: string
  base_date: number
  budget_carry_over: boolean
  budget_email_alerts: boolean
  large_transaction_threshold: number
  categories: string[]
  sources: string[]
}
