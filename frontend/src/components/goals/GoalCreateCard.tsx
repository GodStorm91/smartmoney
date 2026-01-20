import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { Check } from 'lucide-react'

interface GoalCreateCardProps {
  years?: number
  custom?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}

export function GoalCreateCard({ years, custom = false, disabled = false, onClick, className }: GoalCreateCardProps) {
  const { t } = useTranslation()

  const getCardLabel = () => {
    if (custom) return t('goals.card.customPeriod')
    return t('goals.card.yearGoal', { years })
  }

  const getCardDescription = () => {
    if (custom) return t('goals.card.customDescription')
    if (years === 1) return t('goals.card.shortTerm')
    if (years === 3) return t('goals.card.mediumTerm')
    if (years === 5) return t('goals.card.mediumLongTerm')
    if (years === 10) return t('goals.card.longTerm')
    return t('goals.card.createGoal')
  }

  const getEmoji = () => {
    if (custom) return '⚙️'
    return '📌'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
        disabled
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:shadow-md active:scale-95 cursor-pointer',
        className
      )}
      aria-label={disabled ? t('goals.card.ariaDisabled', { label: getCardLabel() }) : t('goals.card.ariaCreate', { label: getCardLabel() })}
      aria-disabled={disabled}
    >
      {/* Checkmark for disabled/active */}
      {disabled && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
            <Check className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center text-center gap-2">
        {/* Icon */}
        <div className="text-3xl">
          {getEmoji()}
        </div>

        {/* Label */}
        <div>
          <h3 className={cn(
            'text-sm font-semibold',
            disabled ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'
          )}>
            {getCardLabel()}
          </h3>
          <p className={cn(
            'text-xs mt-0.5',
            disabled ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'
          )}>
            {getCardDescription()}
          </p>
        </div>
      </div>
    </button>
  )
}
