import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { sendChatMessage, type ChatMessage } from '@/services/chat-service'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)

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
        content: response.message
      }])

      setCredits(response.credits_remaining)

      // TODO: Handle suggested_action in Phase 2
      if (response.suggested_action) {
        console.log('Suggested action:', response.suggested_action)
      }
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
        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </>
  )
}
