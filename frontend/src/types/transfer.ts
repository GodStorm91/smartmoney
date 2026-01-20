// Transfer types

export interface TransferCreate {
  from_account_id: number
  to_account_id: number
  from_amount: number
  to_amount: number
  exchange_rate?: number
  fee_amount: number
  date: string
  description?: string
}

export interface TransferResponse {
  transfer_id: string
  from_transaction_id: number
  to_transaction_id: number
  fee_transaction_id?: number
}

export interface Transfer {
  transfer_id: string
  from_account_id: number
  from_account_name: string
  from_currency: string
  to_account_id: number
  to_account_name: string
  to_currency: string
  from_amount: number
  to_amount: number
  fee_amount: number
  date: string
  description?: string
}
