import { apiClient } from './api-client'

export interface SuggestedAction {
  type: 'create_goal' | 'create_budget'
  payload: Record<string, unknown>
  description: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  action?: SuggestedAction | null
}

export interface ChatResponse {
  message: string
  suggested_action: SuggestedAction | null
  credits_remaining: number
}

/**
 * Send chat message to AI assistant
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  language: string = 'ja'
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/api/chat', {
    messages,
    language
  })
  return response.data
}
