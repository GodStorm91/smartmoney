import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/Badge'

interface GoalCreateCardProps {
  years?: number
  custom?: boolean
  disabled?: boolean
  onClick: () => void
}

export function GoalCreateCard({ years, custom = false, disabled = false, onClick }: GoalCreateCardProps) {
  const getCardLabel = () => {
    if (custom) return 'カスタム期間'
    if (years === 1) return '1年目標'
    if (years === 3) return '3年目標'
    if (years === 5) return '5年目標'
    if (years === 10) return '10年目標'
    return '新規目標'
  }

  const getCardDescription = () => {
    if (custom) return '自由に期間を設定'
    if (years === 1) return '短期的な貯蓄目標'
    if (years === 3) return '中期的な計画'
    if (years === 5) return '中長期的な目標'
    if (years === 10) return '長期的なビジョン'
    return '目標を作成'
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
      aria-label={disabled ? `${getCardLabel()} - 設定済み` : `${getCardLabel()}を作成`}
      aria-disabled={disabled}
    >
      {/* Badge for disabled state */}
      {disabled && (
        <div className="absolute top-3 right-3">
          <Badge variant="default" className="text-xs">
            設定済み
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
