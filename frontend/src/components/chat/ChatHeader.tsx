import { useTranslation } from 'react-i18next'
import { X, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ChatHeaderProps {
  onClose: () => void
  credits: number | null
}

export function ChatHeader({ onClose, credits }: ChatHeaderProps) {
  const { t } = useTranslation()

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
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-lg',
            'text-gray-500 hover:text-gray-700',
            'dark:text-gray-400 dark:hover:text-gray-200',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'transition-colors'
          )}
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
