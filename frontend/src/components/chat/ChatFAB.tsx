import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { MessageCircle } from 'lucide-react'

interface ChatFABProps {
  onClick: () => void
  hasUnread?: boolean
}

export function ChatFAB({ onClick, hasUnread = false }: ChatFABProps) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-56 right-4 sm:bottom-6 sm:right-6 z-[101]',
        'w-14 h-14 rounded-full',
        'bg-primary-500 text-white shadow-lg',
        'hover:bg-primary-600 hover:scale-105',
        'active:scale-95',
        'transition-all duration-200',
        'flex items-center justify-center',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
      )}
      aria-label="Open AI Assistant"
    >
      <MessageCircle className="w-6 h-6" />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  )

  // Use portal to ensure fixed positioning works correctly
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return null
}
