import { apiClient } from './api-client'

export interface McpTokenStatus {
  enabled: boolean
  created_at: string | null
}

export interface McpTokenResult {
  token: string
  created_at: string
  expires_days: number
}

/**
 * Fetch MCP token status (never returns the token itself)
 */
export async function fetchMcpTokenStatus(): Promise<McpTokenStatus> {
  const response = await apiClient.get<McpTokenStatus>('/api/auth/mcp-token')
  return response.data
}

/**
 * Generate (or rotate) the MCP token. Returns the token ONCE.
 */
export async function generateMcpToken(): Promise<McpTokenResult> {
  const response = await apiClient.post<McpTokenResult>('/api/auth/mcp-token')
  return response.data
}

/**
 * Revoke the active MCP token
 */
export async function revokeMcpToken(): Promise<void> {
  await apiClient.delete('/api/auth/mcp-token')
}

// ---------------------------------------------------------------------------
// MCP Write Token (30-day expiry, accepted only on /api/upload/csv)
// ---------------------------------------------------------------------------

/**
 * Fetch MCP write token status (never returns the token itself)
 */
export async function fetchMcpWriteTokenStatus(): Promise<McpTokenStatus> {
  const response = await apiClient.get<McpTokenStatus>('/api/auth/mcp-write-token')
  return response.data
}

/**
 * Generate (or rotate) the MCP write token. Returns the token ONCE.
 */
export async function generateMcpWriteToken(): Promise<McpTokenResult> {
  const response = await apiClient.post<McpTokenResult>('/api/auth/mcp-write-token')
  return response.data
}

/**
 * Revoke the active MCP write token
 */
export async function revokeMcpWriteToken(): Promise<void> {
  await apiClient.delete('/api/auth/mcp-write-token')
}
