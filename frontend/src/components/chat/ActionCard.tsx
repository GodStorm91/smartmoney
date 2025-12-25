import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { Target, PieChart, Loader2 } from 'lucide-react'
import type { SuggestedAction } from '@/services/chat-service'

interface ActionCardProps {
  action: SuggestedAction
  onApply: () => void
  onSkip: () => void
  isApplying?: boolean
}

export function ActionCard({ action, onApply, onSkip, isApplying = false }: ActionCardProps) {
  const { t } = useTranslation()

  const getIcon = () => {
    if (action.type === 'create_goal') {
      return <Target className="w-5 h-5 text-primary-500" />
    }
    if (action.type === 'create_budget') {
      return <PieChart className="w-5 h-5 text-primary-500" />
    }
    return null
  }

  const getTitle = () => {
    return t(`chat.action.${action.type}`)
  }

  return (
    <div className={cn(
      'bg-primary-50 dark:bg-primary-900/30',
      'border border-primary-200 dark:border-primary-700',
      'rounded-lg p-3 mt-2'
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm">
            {getTitle()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {action.description}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onApply}
          disabled={isApplying}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md',
            'bg-primary-500 text-white',
            'hover:bg-primary-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            'flex items-center justify-center gap-1.5'
          )}
        >
          {isApplying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            t('chat.apply')
          )}
        </button>
        <button
          onClick={onSkip}
          disabled={isApplying}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md',
            'border border-gray-300 dark:border-gray-600',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          {t('chat.skip')}
        </button>
      </div>
    </div>
  )
}
