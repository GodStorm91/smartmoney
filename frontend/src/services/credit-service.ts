import { apiClient } from './api-client'
import type {
  CreditBalance,
  // PurchaseRequest,
  PurchaseResponse,
  TransactionHistory,
  PackageType,
  PaymentMethod
} from '@/types/credit'

/**
 * Get current user's credit balance
 */
export async function getCreditBalance(): Promise<CreditBalance> {
  const response = await apiClient.get<CreditBalance>('/api/credits/balance')
  return response.data
}

/**
 * Purchase credits
 */
export async function purchaseCredits(
  packageType: PackageType,
  paymentMethod: PaymentMethod = 'bank_transfer',
  returnUrl?: string
): Promise<PurchaseResponse> {
  const response = await apiClient.post<PurchaseResponse>('/api/credits/purchase', {
    package: packageType,
    payment_method: paymentMethod,
    return_url: returnUrl
  })
  return response.data
}

/**
 * Get credit transaction history
 */
export async function getCreditTransactions(
  page: number = 1,
  perPage: number = 20,
  type: string = 'all'
): Promise<TransactionHistory> {
  const response = await apiClient.get<TransactionHistory>('/api/credits/transactions', {
    params: { page, per_page: perPage, type }
  })
  return response.data
}
