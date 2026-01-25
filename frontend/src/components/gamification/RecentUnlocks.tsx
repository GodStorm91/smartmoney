import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Achievement } from '@/services/gamification-service'

interface RecentUnlocksProps {
  badges: Achievement[]
  onBadgeClick: (badge: Achievement) => void
}

const rarityGlow: Record<string, string> = {
  legendary: 'ring-yellow-400/60 shadow-yellow-400/30',
  epic: 'ring-purple-400/60 shadow-purple-400/30',
  rare: 'ring-blue-400/60 shadow-blue-400/30',
  common: 'ring-gray-400/60 shadow-gray-400/30',
}

const rarityBg: Record<string, string> = {
  legendary: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30',
  epic: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30',
  rare: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
  common: 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700',
}

export function RecentUnlocks({ badges, onBadgeClick }: RecentUnlocksProps) {
  const { t } = useTranslation('common')

  if (badges.length === 0) {
    return (
      <div className="py-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {t('gamification.recentUnlocks') || 'Recent Unlocks'}
        </h3>
        <div className="flex items-center justify-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            {t('gamification.noRecentUnlocks') || 'Complete actions to earn badges!'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        {t('gamification.recentUnlocks') || 'Recent Unlocks'}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {badges.map((badge) => {
          const rarity = badge.rarity || 'common'
          return (
            <button
              key={badge.id}
              onClick={() => onBadgeClick(badge)}
              className={cn(
                'flex-shrink-0 p-4 rounded-xl ring-2 shadow-lg',
                'hover:scale-105 active:scale-95 transition-all duration-200',
                rarityGlow[rarity],
                rarityBg[rarity]
              )}
            >
              <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-white/80 dark:bg-gray-800/80 flex items-center justify-center text-3xl shadow-inner">
                {badge.icon}
              </div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-center truncate max-w-[80px]">
                {badge.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center capitalize">
                {rarity}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default RecentUnlocks
