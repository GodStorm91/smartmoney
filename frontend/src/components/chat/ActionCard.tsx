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
  const { t, i18n } = useTranslation()

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

  const formatCurrency = (value: number) => {
    const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'vi' ? 'vi-VN' : 'en-US'
    const currency = i18n.language === 'ja' ? 'JPY' : i18n.language === 'vi' ? 'VND' : 'USD'
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(i18n.language).format(value)
  }

  const renderParameters = () => {
    if (!action.payload || Object.keys(action.payload).length === 0) {
      return null
    }

    const params = action.payload as Record<string, unknown>
    const paramEntries = Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)

    if (paramEntries.length === 0) return null

    return (
      <div className="mt-3 pt-3 border-t border-primary-200/50 dark:border-primary-700/50">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('chat.action.parameters', 'Parameters')}:
        </p>
        <div className="space-y-1.5">
          {paramEntries.map(([key, value]) => {
            const label = t(`chat.action.${key}`, key.replace(/_/g, ' '))
            let formattedValue = String(value)

            // Format based on key name
            if (key.includes('amount') || key.includes('income')) {
              formattedValue = formatCurrency(Number(value))
            } else if (key === 'years' || typeof value === 'number') {
              formattedValue = formatNumber(Number(value))
            } else if (key === 'language') {
              formattedValue = t(`languages.${value}`, String(value))
            } else if (key === 'goal_type') {
              formattedValue = t(`goals.types.${value}`, String(value))
            }

            return (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {label}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium flex-1 text-right">
                  {formattedValue}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-primary-50 dark:bg-primary-900/20',
      'border border-primary-200 dark:border-primary-700',
      'rounded-lg p-3 mt-2',
      'transition-all duration-200',
      'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600'
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

      {renderParameters()}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onApply}
          disabled={isApplying}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md',
            'bg-primary-500 text-white',
            'hover:bg-primary-600 active:bg-primary-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200',
            'flex items-center justify-center gap-1.5',
            !isApplying && 'hover:shadow-md'
          )}
        >
          {isApplying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('loading')}
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
