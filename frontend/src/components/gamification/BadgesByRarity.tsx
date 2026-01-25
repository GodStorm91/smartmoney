import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Crown, Gem, Star, Circle, Lock } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Achievement } from '@/services/gamification-service'

interface BadgesByRarityProps {
  achievements: Achievement[]
  onBadgeClick: (badge: Achievement) => void
}

type RarityKey = 'legendary' | 'epic' | 'rare' | 'common'

const rarityConfig: Record<RarityKey, {
  icon: typeof Crown
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  iconColor: string
}> = {
  legendary: {
    icon: Crown,
    label: 'Legendary',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-500',
  },
  epic: {
    icon: Gem,
    label: 'Epic',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-800 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-500',
  },
  rare: {
    icon: Star,
    label: 'Rare',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
  },
  common: {
    icon: Circle,
    label: 'Common',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    textColor: 'text-gray-800 dark:text-gray-300',
    borderColor: 'border-gray-200 dark:border-gray-700',
    iconColor: 'text-gray-500',
  },
}

const RARITY_ORDER: RarityKey[] = ['legendary', 'epic', 'rare', 'common']

export function BadgesByRarity({ achievements, onBadgeClick }: BadgesByRarityProps) {
  const { t } = useTranslation('common')
  const [expandedRarities, setExpandedRarities] = useState<Set<RarityKey>>(new Set())

  const toggleRarity = (rarity: RarityKey) => {
    setExpandedRarities(prev => {
      const next = new Set(prev)
      if (next.has(rarity)) {
        next.delete(rarity)
      } else {
        next.add(rarity)
      }
      return next
    })
  }

  // Group by rarity
  const groupedByRarity = RARITY_ORDER.reduce((acc, rarity) => {
    const badges = achievements.filter(a => (a.rarity || 'common') === rarity)
    // Sort: unlocked first, then by XP reward
    badges.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
      return b.xp_reward - a.xp_reward
    })
    acc[rarity] = badges
    return acc
  }, {} as Record<RarityKey, Achievement[]>)

  return (
    <div className="py-2">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        {t('gamification.allBadges') || 'All Badges'}
      </h3>

      <div className="space-y-2">
        {RARITY_ORDER.map((rarity) => {
          const badges = groupedByRarity[rarity]
          const config = rarityConfig[rarity]
          const Icon = config.icon
          const unlockedCount = badges.filter(b => b.unlocked).length
          const isExpanded = expandedRarities.has(rarity)

          return (
            <div
              key={rarity}
              className={cn(
                'rounded-xl border overflow-hidden',
                config.borderColor
              )}
            >
              {/* Accordion header */}
              <button
                onClick={() => toggleRarity(rarity)}
                className={cn(
                  'w-full flex items-center justify-between p-4 transition-colors',
                  config.bgColor,
                  'hover:opacity-90'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('w-5 h-5', config.iconColor)} />
                  <span className={cn('font-semibold', config.textColor)}>
                    {t(`gamification.rarity.${rarity}`) || config.label}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    config.bgColor,
                    config.textColor
                  )}>
                    {unlockedCount}/{badges.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-gray-400 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>

              {/* Accordion content */}
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                <div className="overflow-hidden">
                  <div className="p-4 pt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {badges.map((badge) => (
                      <button
                        key={badge.id}
                        onClick={() => onBadgeClick(badge)}
                        className={cn(
                          'relative p-3 rounded-xl transition-all duration-200',
                          'hover:scale-105 active:scale-95',
                          badge.unlocked
                            ? 'bg-white dark:bg-gray-800 shadow-sm hover:shadow-md'
                            : 'bg-gray-100 dark:bg-gray-900 opacity-60'
                        )}
                      >
                        <div className={cn(
                          'w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl',
                          badge.unlocked
                            ? 'bg-gray-100 dark:bg-gray-700'
                            : 'bg-gray-200 dark:bg-gray-800 grayscale'
                        )}>
                          {badge.icon}
                        </div>
                        <p className={cn(
                          'text-xs font-medium text-center truncate',
                          badge.unlocked
                            ? 'text-gray-800 dark:text-gray-200'
                            : 'text-gray-500 dark:text-gray-500'
                        )}>
                          {badge.name}
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          +{badge.xp_reward} XP
                        </p>

                        {/* Lock overlay for locked badges */}
                        {!badge.unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/5 dark:bg-black/20">
                            <Lock className="w-4 h-4 text-gray-400" />
                          </div>
                        )}

                        {/* Progress indicator for in-progress badges */}
                        {!badge.unlocked && badge.progress > 0 && (
                          <div className="absolute bottom-1 left-1 right-1">
                            <div className="h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${badge.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BadgesByRarity
