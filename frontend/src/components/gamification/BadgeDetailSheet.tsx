import { useTranslation } from 'react-i18next'
import { Star, Calendar, Lock } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { cn } from '@/utils/cn'
import { getLocaleTag } from '@/utils/formatDate'
import type { Achievement } from '@/services/gamification-service'

interface BadgeDetailSheetProps {
  badge: Achievement | null
  onClose: () => void
}

const rarityConfig: Record<string, {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
}> = {
  legendary: {
    label: 'Legendary',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    borderColor: 'border-yellow-400',
  },
  epic: {
    label: 'Epic',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-400',
  },
  rare: {
    label: 'Rare',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-400',
  },
  common: {
    label: 'Common',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-400',
  },
}

export function BadgeDetailSheet({ badge, onClose }: BadgeDetailSheetProps) {
  const { t } = useTranslation('common')

  if (!badge) return null

  const rarity = (badge.rarity || 'common') as keyof typeof rarityConfig
  const config = rarityConfig[rarity]

  return (
    <BottomSheet
      isOpen={!!badge}
      onClose={onClose}
      title={badge.name}
    >
      <div className="space-y-6">
        {/* Badge icon with rarity styling */}
        <div className="flex flex-col items-center">
          <div className={cn(
            'w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg border-2',
            config.bgColor,
            config.borderColor,
            !badge.unlocked && 'grayscale opacity-60'
          )}>
            {badge.icon}
            {!badge.unlocked && (
              <div className="absolute">
                <Lock className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>

          {/* Rarity badge */}
          <span className={cn(
            'mt-3 px-3 py-1 text-sm font-semibold rounded-full',
            config.bgColor,
            config.textColor
          )}>
            {t(`gamification.rarity.${rarity}`) || config.label}
          </span>
        </div>

        {/* Description */}
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {badge.description}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            'p-4 rounded-xl text-center',
            config.bgColor
          )}>
            <Star className={cn('w-5 h-5 mx-auto mb-1', config.textColor)} />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              +{badge.xp_reward}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('gamification.xpReward') || 'XP Reward'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-center">
            <div className="w-5 h-5 mx-auto mb-1 text-gray-500 flex items-center justify-center">
              📁
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {badge.category}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('gamification.category') || 'Category'}
            </p>
          </div>
        </div>

        {/* Progress or unlock date */}
        {badge.unlocked ? (
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              {t('gamification.badge.unlockedOn', {
                date: badge.unlocked_at
                  ? new Date(badge.unlocked_at).toLocaleDateString(getLocaleTag())
                  : 'Unknown'
              })}
            </span>
          </div>
        ) : badge.progress > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('gamification.progress') || 'Progress'}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {badge.progress}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500',
                  badge.progress >= 75 ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
                )}
                style={{ width: `${badge.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            {t('gamification.notStarted') || 'Not started yet'}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

export default BadgeDetailSheet
