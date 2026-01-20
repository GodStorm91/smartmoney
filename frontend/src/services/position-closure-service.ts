/**
 * Position Closure Service
 * API functions for closing LP positions and tracking realized P&L
 */
import { apiClient } from './api-client'

export interface ClosePositionRequest {
  exit_date: string // ISO datetime
  exit_value_usd: number
  exit_value_jpy: number
  destination_account_id: number
  note?: string
  tx_hash?: string
  wallet_address: string
  chain_id: string
  protocol: string
  symbol: string
}

export interface PositionClosure {
  id: number
  position_id: string
  protocol: string
  symbol: string
  chain_id: string
  wallet_address: string
  exit_date: string
  exit_value_usd: number
  exit_value_jpy: number
  cost_basis_usd: number | null
  total_rewards_usd: number | null
  realized_pnl_usd: number | null
  realized_pnl_jpy: number | null
  realized_pnl_pct: number | null
  transaction_id: number | null
  note: string | null
  exit_tx_hash: string | null
  created_at: string
}

export interface ClosedPositionsSummary {
  total_closed: number
  total_exit_value_jpy: number
  total_realized_pnl_jpy: number | null
  positions: PositionClosure[]
}

/**
 * Close a DeFi position and record P&L
 * Creates income transaction to destination bank account
 */
export async function closePosition(
  positionId: string,
  data: ClosePositionRequest
): Promise<PositionClosure> {
  const response = await apiClient.post<PositionClosure>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/close`,
    data
  )
  return response.data
}

/**
 * Get all closed positions with summary
 */
export async function getClosedPositions(): Promise<ClosedPositionsSummary> {
  const response = await apiClient.get<ClosedPositionsSummary>(
    '/api/crypto/positions/closed'
  )
  return response.data
}

/**
 * Check if a position is already closed
 */
export async function isPositionClosed(positionId: string): Promise<boolean> {
  const response = await apiClient.get<{ is_closed: boolean }>(
    `/api/crypto/positions/${encodeURIComponent(positionId)}/is-closed`
  )
  return response.data.is_closed
}
