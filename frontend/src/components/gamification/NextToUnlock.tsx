import { useTranslation } from 'react-i18next'
import { Target, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import type { Achievement } from '@/services/gamification-service'

interface NextToUnlockProps {
  badges: Achievement[]
  onAddTransaction: () => void
  onBadgeClick: (badge: Achievement) => void
}

const rarityColors: Record<string, string> = {
  legendary: 'text-yellow-600 dark:text-yellow-400',
  epic: 'text-purple-600 dark:text-purple-400',
  rare: 'text-blue-600 dark:text-blue-400',
  common: 'text-gray-600 dark:text-gray-400',
}

const progressBarColors: Record<string, string> = {
  legendary: 'bg-yellow-500',
  epic: 'bg-purple-500',
  rare: 'bg-blue-500',
  common: 'bg-gray-500',
}

export function NextToUnlock({ badges, onAddTransaction, onBadgeClick }: NextToUnlockProps) {
  const { t } = useTranslation('common')

  if (badges.length === 0) {
    return null
  }

  return (
    <div className="py-2">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Target className="w-4 h-4" />
        {t('gamification.nextToUnlock') || 'Next To Unlock'}
      </h3>

      <Card className="overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {badges.map((badge) => {
            const rarity = badge.rarity || 'common'
            const isClose = badge.progress >= 75

            return (
              <button
                key={badge.id}
                onClick={() => onBadgeClick(badge)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0">
                  {badge.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {badge.name}
                    </span>
                    <span className={cn('text-xs font-medium capitalize', rarityColors[rarity])}>
                      {rarity}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          progressBarColors[rarity],
                          isClose && 'animate-pulse'
                        )}
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-sm font-semibold min-w-[40px] text-right',
                      isClose ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                    )}>
                      {badge.progress}%
                    </span>
                  </div>

                  {/* Hint text */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {badge.description}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            )
          })}
        </div>

        {/* CTA button */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onAddTransaction}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('gamification.addTransaction') || 'Add Transaction'}
          </button>
        </div>
      </Card>
    </div>
  )
}

export default NextToUnlock
