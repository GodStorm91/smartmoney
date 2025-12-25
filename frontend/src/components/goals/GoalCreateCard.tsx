import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/Badge'

interface GoalCreateCardProps {
  years?: number
  custom?: boolean
  disabled?: boolean
  onClick: () => void
}

export function GoalCreateCard({ years, custom = false, disabled = false, onClick }: GoalCreateCardProps) {
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
    return '➕'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative w-full p-6 rounded-xl border-2 border-dashed',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : 'border-gray-300 bg-white hover:border-primary-500 hover:bg-primary-50 hover:shadow-md cursor-pointer'
      )}
      aria-label={disabled ? t('goals.card.ariaDisabled', { label: getCardLabel() }) : t('goals.card.ariaCreate', { label: getCardLabel() })}
      aria-disabled={disabled}
    >
      {/* Badge for disabled state */}
      {disabled && (
        <div className="absolute top-3 right-3">
          <Badge variant="default" className="text-xs">
            {t('goals.card.alreadySet')}
          </Badge>
        </div>
      )}

      {/* Icon */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className={cn(
            'text-5xl transition-transform duration-200',
            !disabled && 'group-hover:scale-110'
          )}
        >
          {getEmoji()}
        </div>

        {/* Label */}
        <div className="text-center">
          <h3
            className={cn(
              'text-lg font-semibold mb-1',
              disabled ? 'text-gray-400' : 'text-gray-900'
            )}
          >
            {getCardLabel()}
          </h3>
          <p
            className={cn(
              'text-sm',
              disabled ? 'text-gray-400' : 'text-gray-600'
            )}
          >
            {getCardDescription()}
          </p>
        </div>
      </div>
    </button>
  )
}
