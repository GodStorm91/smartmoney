import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { ChatMessage } from './ChatMessage'
import { ActionCard } from './ActionCard'
import { QuickActionButton } from './QuickActionButton'
import { Loader2 } from 'lucide-react'
import type { SuggestedAction, QuickAction } from '@/services/chat-service'

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: SuggestedAction | null
  quickActions?: QuickAction[]
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
  applyingAction: number | null
  onApplyAction: (index: number) => void
  onSkipAction: (index: number) => void
}

export function ChatMessages({
  messages,
  isLoading,
  applyingAction,
  onApplyAction,
  onSkipAction
}: ChatMessagesProps) {
  const { t } = useTranslation()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className={cn(
      'flex-1 overflow-y-auto',
      'px-4 py-4 space-y-4',
      'bg-gray-50 dark:bg-gray-900'
    )}>
      {messages.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
          <p>{t('chat.welcomeMessage')}</p>
        </div>
      )}

      {messages.map((message, index) => (
        <div
          key={index}
          className="animate-[slideUp_200ms_ease-out]"
          style={{ animationDelay: `${Math.min(index * 20, 100)}ms` }}
        >
          <ChatMessage role={message.role} content={message.content} />
          {message.action && (
            <div className="ml-11">
              <ActionCard
                action={message.action}
                onApply={() => onApplyAction(index)}
                onSkip={() => onSkipAction(index)}
                isApplying={applyingAction === index}
              />
            </div>
          )}
          {message.quickActions && message.quickActions.length > 0 && (
            <div className="ml-11 mt-2 flex flex-wrap gap-2">
              {message.quickActions.map((quickAction, qaIndex) => (
                <QuickActionButton
                  key={qaIndex}
                  label={quickAction.label}
                  route={quickAction.route}
                  icon={quickAction.icon}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-2xl rounded-bl-md">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('chat.thinking')}
            </span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
