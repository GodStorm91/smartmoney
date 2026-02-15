import { apiClient } from './api-client'

export interface SuggestedAction {
  type: 'create_goal' | 'create_budget'
  payload: Record<string, unknown>
  description: string
}

export interface QuickAction {
  label: string
  route: string
  icon?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  action?: SuggestedAction | null
  quickActions?: QuickAction[]
}

export interface ChatResponse {
  message: string
  suggested_action: SuggestedAction | null
  quick_actions: QuickAction[]
  credits_remaining: number
}

/**
 * Send chat message to AI assistant
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  language: string = 'ja',
  currentPage?: string
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/api/chat', {
    messages,
    language,
    current_page: currentPage
  })
  return response.data
}
