import { apiClient } from './api-client'
import type {
  CryptoWallet,
  CryptoWalletCreate,
  CryptoWalletUpdate,
  CryptoWalletWithBalance,
  RewardContract,
  RewardContractCreate,
  RewardContractUpdate,
  Portfolio,
  RewardClaim,
} from '@/types'

// ==================== Wallet APIs ====================

export async function fetchWallets(): Promise<CryptoWallet[]> {
  const response = await apiClient.get<CryptoWallet[]>('/api/crypto/wallets')
  return response.data
}

export async function fetchWallet(id: number): Promise<CryptoWalletWithBalance> {
  const response = await apiClient.get<CryptoWalletWithBalance>(`/api/crypto/wallets/${id}`)
  return response.data
}

export async function createWallet(data: CryptoWalletCreate): Promise<CryptoWallet> {
  const response = await apiClient.post<CryptoWallet>('/api/crypto/wallets', data)
  return response.data
}

export async function updateWallet(id: number, data: CryptoWalletUpdate): Promise<CryptoWallet> {
  const response = await apiClient.patch<CryptoWallet>(`/api/crypto/wallets/${id}`, data)
  return response.data
}

export async function deleteWallet(id: number): Promise<void> {
  await apiClient.delete(`/api/crypto/wallets/${id}`)
}

export async function syncWallet(id: number): Promise<Portfolio> {
  const response = await apiClient.post<Portfolio>(`/api/crypto/wallets/${id}/sync`)
  return response.data
}

export async function fetchPortfolio(id: number): Promise<Portfolio> {
  const response = await apiClient.get<Portfolio>(`/api/crypto/wallets/${id}/portfolio`)
  return response.data
}

// ==================== Reward Contract APIs ====================

export async function fetchRewardContracts(): Promise<RewardContract[]> {
  const response = await apiClient.get<RewardContract[]>('/api/crypto/contracts')
  return response.data
}

export async function createRewardContract(data: RewardContractCreate): Promise<RewardContract> {
  const response = await apiClient.post<RewardContract>('/api/crypto/contracts', data)
  return response.data
}

export async function updateRewardContract(
  id: number,
  data: RewardContractUpdate
): Promise<RewardContract> {
  const response = await apiClient.patch<RewardContract>(`/api/crypto/contracts/${id}`, data)
  return response.data
}

export async function deleteRewardContract(id: number): Promise<void> {
  await apiClient.delete(`/api/crypto/contracts/${id}`)
}

// ==================== Reward Claims APIs ====================

export async function fetchRewardClaims(): Promise<RewardClaim[]> {
  const response = await apiClient.get<RewardClaim[]>('/api/crypto/claims')
  return response.data
}

export async function detectClaims(): Promise<{ detected: number; claims: RewardClaim[] }> {
  const response = await apiClient.post<{ detected: number; claims: RewardClaim[] }>(
    '/api/crypto/claims/detect'
  )
  return response.data
}
