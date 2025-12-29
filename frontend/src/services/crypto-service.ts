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
  DefiPositionsResponse,
  PositionHistory,
  PositionPerformance,
  PositionInsights,
  PortfolioInsights,
  ILScenario,
  PositionReward,
  RewardsScanResult,
  PositionROI,
  PositionCostBasis,
  PositionCostBasisCreate,
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

export async function fetchDefiPositions(id: number): Promise<DefiPositionsResponse> {
  const response = await apiClient.get<DefiPositionsResponse>(`/api/crypto/wallets/${id}/defi-positions`)
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

// ==================== Position Analytics APIs ====================

export async function fetchPositionHistory(
  positionId: string,
  days: number = 30
): Promise<PositionHistory> {
  const response = await apiClient.get<PositionHistory>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/history`,
    { params: { days } }
  )
  return response.data
}

export async function fetchPositionPerformance(positionId: string): Promise<PositionPerformance> {
  const response = await apiClient.get<PositionPerformance>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/performance`
  )
  return response.data
}

export async function fetchPositionInsights(
  positionId: string,
  language: string = 'en'
): Promise<PositionInsights> {
  const response = await apiClient.get<PositionInsights>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/insights`,
    { params: { language } }
  )
  return response.data
}

export async function fetchWalletPerformance(walletId: number): Promise<{
  wallet_address: string
  total_value_usd: number
  total_change_7d_usd: number | null
  total_change_30d_usd: number | null
  positions: PositionHistory[]
  snapshot_count: number
  first_snapshot_date: string | null
}> {
  const response = await apiClient.get(`/api/crypto/wallets/${walletId}/performance`)
  return response.data
}

export async function fetchPortfolioInsights(
  walletId: number,
  language: string = 'en'
): Promise<PortfolioInsights> {
  const response = await apiClient.get<PortfolioInsights>(
    `/api/crypto/wallets/${walletId}/insights`,
    { params: { language } }
  )
  return response.data
}

export async function fetchILScenarios(currentPriceRatio: number = 1.0): Promise<ILScenario[]> {
  const response = await apiClient.get<ILScenario[]>('/api/crypto/il/scenarios', {
    params: { current_price_ratio: currentPriceRatio },
  })
  return response.data
}

export async function backfillWalletSnapshots(
  walletId: number
): Promise<{ message: string; stats: { positions: number; skipped: number } }> {
  const response = await apiClient.post(`/api/crypto/wallets/${walletId}/backfill`)
  return response.data
}

// ==================== Position Rewards APIs ====================

export async function fetchPositionRewards(): Promise<PositionReward[]> {
  const response = await apiClient.get<PositionReward[]>('/api/crypto/rewards')
  return response.data
}

export async function fetchUnattributedRewards(): Promise<PositionReward[]> {
  const response = await apiClient.get<PositionReward[]>('/api/crypto/rewards/unattributed')
  return response.data
}

export async function attributeReward(rewardId: number, positionId: string): Promise<PositionReward> {
  const response = await apiClient.post<PositionReward>(
    `/api/crypto/rewards/${rewardId}/attribute`,
    { position_id: positionId }
  )
  return response.data
}

export async function scanRewards(days: number = 90): Promise<RewardsScanResult> {
  const response = await apiClient.post<RewardsScanResult>('/api/crypto/rewards/scan', { days })
  return response.data
}

export async function fetchPositionROI(positionId: string): Promise<PositionROI> {
  const response = await apiClient.get<PositionROI>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/roi`
  )
  return response.data
}

export async function fetchPositionRewardsList(positionId: string): Promise<PositionReward[]> {
  const response = await apiClient.get<PositionReward[]>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/rewards`
  )
  return response.data
}

// ==================== Cost Basis APIs ====================

export async function createCostBasis(data: PositionCostBasisCreate): Promise<PositionCostBasis> {
  const response = await apiClient.post<PositionCostBasis>('/api/crypto/cost-basis', data)
  return response.data
}

export async function fetchPositionCostBasis(positionId: string): Promise<PositionCostBasis> {
  const response = await apiClient.get<PositionCostBasis>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/cost-basis`
  )
  return response.data
}
