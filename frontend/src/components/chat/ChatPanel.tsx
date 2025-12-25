import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/utils/cn'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { sendChatMessage, type ChatMessage, type SuggestedAction } from '@/services/chat-service'
import { createGoal } from '@/services/goal-service'
import { generateBudget } from '@/services/budget-service'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [applyingAction, setApplyingAction] = useState<number | null>(null)

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await sendChatMessage(newMessages, i18n.language)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        action: response.suggested_action
      }])

      setCredits(response.credits_remaining)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Check for insufficient credits - show as assistant message
      if (errorMessage.includes('402') || errorMessage.includes('credits')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: t('chat.noCredits')
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: t('chat.error')
        }])
      }
    } finally {
      setIsLoading(false)
    }
  }, [messages, i18n.language, t])

  const handleApplyAction = useCallback(async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message?.action) return

    setApplyingAction(messageIndex)

    try {
      await executeAction(message.action)

      // Remove the action from the message and add success message
      setMessages(prev => {
        const updated = [...prev]
        updated[messageIndex] = { ...updated[messageIndex], action: null }
        return [...updated, {
          role: 'assistant' as const,
          content: t('chat.actionApplied')
        }]
      })

      // Invalidate relevant queries
      if (message.action.type === 'create_goal') {
        queryClient.invalidateQueries({ queryKey: ['goals'] })
      } else if (message.action.type === 'create_budget') {
        queryClient.invalidateQueries({ queryKey: ['budget'] })
      }
    } catch (error) {
      console.error('Failed to apply action:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('chat.actionFailed')
      }])
    } finally {
      setApplyingAction(null)
    }
  }, [messages, queryClient, t])

  const executeAction = async (action: SuggestedAction) => {
    if (action.type === 'create_goal') {
      const payload = action.payload as {
        goal_type?: string
        target_amount?: number
        years?: number
        name?: string
      }
      // Validate goal_type
      const validTypes = ['emergency_fund', 'home_down_payment', 'vacation_travel', 'vehicle',
        'education', 'wedding', 'large_purchase', 'debt_payoff', 'retirement', 'investment', 'custom']
      const goalType = validTypes.includes(payload.goal_type || '')
        ? payload.goal_type as 'custom' | 'emergency_fund' | 'home_down_payment' | 'vacation_travel' | 'vehicle' | 'education' | 'wedding' | 'large_purchase' | 'debt_payoff' | 'retirement' | 'investment'
        : 'custom'

      await createGoal({
        goal_type: goalType,
        target_amount: payload.target_amount || 100000,
        years: payload.years || 1,
        name: payload.name
      })
    } else if (action.type === 'create_budget') {
      const payload = action.payload as {
        monthly_income?: number
        feedback?: string
      }
      await generateBudget({
        monthly_income: payload.monthly_income || 300000,
        feedback: payload.feedback,
        language: i18n.language
      })
    }
  }

  const handleSkipAction = useCallback((messageIndex: number) => {
    // Remove the action from the message
    setMessages(prev => {
      const updated = [...prev]
      updated[messageIndex] = { ...updated[messageIndex], action: null }
      return updated
    })
  }, [])

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-50',
          'w-full sm:w-96',
          'bg-white dark:bg-gray-800',
          'shadow-2xl',
          'flex flex-col',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <ChatHeader onClose={onClose} credits={credits} />
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          applyingAction={applyingAction}
          onApplyAction={handleApplyAction}
          onSkipAction={handleSkipAction}
        />
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </>
  )
}
