import { useTranslation } from 'react-i18next'
import { X, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ChatHeaderProps {
  onClose: () => void
  credits: number | null
  onClearHistory?: () => void
}

export function ChatHeader({ onClose, credits, onClearHistory }: ChatHeaderProps) {
  const { t } = useTranslation()

  const handleClearHistory = () => {
    if (window.confirm(t('chat.clearHistoryConfirm'))) {
      onClearHistory?.()
    }
  }

  return (
    <div className={cn(
      'flex items-center justify-between',
      'px-4 py-3 border-b border-gray-200 dark:border-gray-700',
      'bg-white dark:bg-gray-800'
    )}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-500" />
        <h2 className="font-semibold text-gray-900 dark:text-white">
          {t('chat.title')}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {credits !== null && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('chat.credits', { count: credits })}
          </span>
        )}
        {onClearHistory && (
          <button
            onClick={handleClearHistory}
            className={cn(
              'p-1.5 rounded-lg',
              'text-gray-500 hover:text-gray-700',
              'dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors'
            )}
            aria-label={t('chat.clearHistory')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-lg',
            'text-gray-500 hover:text-gray-700',
            'dark:text-gray-400 dark:hover:text-gray-200',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'transition-colors'
          )}
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
