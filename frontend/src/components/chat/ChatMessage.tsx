import { cn } from '@/utils/cn'
import { User, Sparkles } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn(
      'flex gap-3',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full',
        'flex items-center justify-center',
        isUser
          ? 'bg-primary-100 dark:bg-primary-900'
          : 'bg-gray-100 dark:bg-gray-700'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>

      {/* Message bubble */}
      <div className={cn(
        'max-w-[80%] px-4 py-2.5 rounded-2xl',
        'text-sm leading-relaxed',
        isUser
          ? 'bg-primary-500 text-white rounded-br-md'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
      )}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
