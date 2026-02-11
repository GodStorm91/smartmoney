import { useTranslation } from 'react-i18next'
import type { GoalType } from '@/types/goal'

interface GoalTypeSelectorProps {
  selectedType: GoalType | null
  onSelect: (type: GoalType) => void
  hasEmergencyFund: boolean
}

const GOAL_TYPE_CONFIG: Record<GoalType, { icon: string; color: string }> = {
  emergency_fund: { icon: '🛡️', color: 'bg-red-50 border-red-200 hover:bg-red-100' },
  home_down_payment: { icon: '🏠', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  vacation_travel: { icon: '✈️', color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
  vehicle: { icon: '🚗', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
  education: { icon: '📚', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
  wedding: { icon: '💍', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
  large_purchase: { icon: '🛒', color: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
  debt_payoff: { icon: '💳', color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
  retirement: { icon: '🏖️', color: 'bg-teal-50 border-teal-200 hover:bg-teal-100' },
  investment: { icon: '📈', color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
  custom: { icon: '🎯', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
}

const GOAL_TYPES: GoalType[] = [
  'emergency_fund', 'home_down_payment', 'vacation_travel', 'vehicle',
  'education', 'wedding', 'large_purchase', 'debt_payoff',
  'retirement', 'investment', 'custom'
]

export function GoalTypeSelector({ selectedType, onSelect, hasEmergencyFund }: GoalTypeSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t('goals.selectType')}</p>

      {!hasEmergencyFund && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {t('goals.emergencyFundFirst')}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GOAL_TYPES.map((type) => {
          const config = GOAL_TYPE_CONFIG[type]
          const isSelected = selectedType === type
          const isDisabled = !hasEmergencyFund && type !== 'emergency_fund'

          return (
            <button
              key={type}
              onClick={() => !isDisabled && onSelect(type)}
              disabled={isDisabled}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${isSelected ? 'ring-2 ring-primary-500 border-primary-500' : config.color}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-2xl block mb-1">{config.icon}</span>
              <span className="text-xs font-medium text-gray-700 block">
                {t(`goals.types.${type}`)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
