import { apiClient } from './api-client'

export interface ProxyPurchaseCreate {
  client_account_id: number
  item: string
  cost: number
  payment_account_id: number
  markup_price: number
  exchange_rate: number
  purchase_date: string
  notes?: string
}

export interface ProxyPurchaseResponse {
  proxy_id: string
  expense_transaction_id: number
  receivable_transaction_id: number
  client_charge_vnd: number
  profit_jpy: number
}

export interface OutstandingItem {
  transaction_id: number
  item: string
  amount_jpy: number
  charge_vnd: number
  exchange_rate: number
  date: string
}

export interface OutstandingClient {
  client_id: number
  client_name: string
  total_jpy: number
  total_vnd: number
  items: OutstandingItem[]
  oldest_date: string | null
  item_count: number
}

export interface ProxySettleCreate {
  client_account_id: number
  transaction_ids: number[]
  receive_account_id: number
  vnd_amount: number
  payment_date: string
}

export interface ProxySettleResponse {
  settlement_id: string
  cleared_transaction_id: number
  income_transaction_id: number
  items_settled: number
}

/**
 * Create a proxy purchase
 */
export async function createProxyPurchase(
  data: ProxyPurchaseCreate
): Promise<ProxyPurchaseResponse> {
  const response = await apiClient.post<ProxyPurchaseResponse>('/api/proxy/purchase', data)
  return response.data
}

/**
 * Get outstanding receivables grouped by client
 */
export async function getOutstandingReceivables(): Promise<OutstandingClient[]> {
  const response = await apiClient.get<OutstandingClient[]>('/api/proxy/outstanding')
  return response.data
}

/**
 * Settle proxy payment
 */
export async function settleProxyPayment(
  data: ProxySettleCreate
): Promise<ProxySettleResponse> {
  const response = await apiClient.post<ProxySettleResponse>('/api/proxy/settle', data)
  return response.data
}

/**
 * Get client proxy history
 */
export async function getClientProxyHistory(clientId: number): Promise<unknown[]> {
  const response = await apiClient.get(`/api/proxy/client/${clientId}/history`)
  return response.data
}
