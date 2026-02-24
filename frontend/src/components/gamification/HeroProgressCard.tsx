import { useTranslation } from 'react-i18next'
import { Flame, Trophy } from 'lucide-react'
import { cn } from '@/utils/cn'

interface HeroProgressCardProps {
  level: number
  totalXP: number
  xpToNextLevel: number
  progressPercent: number
  currentStreak: number
  badgesUnlocked: number
  badgesTotal: number
  avatarEmoji?: string
  onAvatarClick: () => void
}

export function HeroProgressCard({
  level,
  totalXP,
  xpToNextLevel,
  progressPercent,
  currentStreak,
  badgesUnlocked,
  badgesTotal,
  avatarEmoji = '😊',
  onAvatarClick,
}: HeroProgressCardProps) {
  const { t } = useTranslation('common')

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-red-400'
    if (streak >= 7) return 'text-orange-400'
    if (streak >= 3) return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-5 text-white shadow-xl">
      {/* Background decorations */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5" />

      <div className="relative z-10">
        {/* Top row: Avatar + Level */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onAvatarClick}
            className="group relative flex-shrink-0"
            aria-label={t('gamification.profile.changeAvatar') || 'Change avatar'}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl shadow-lg ring-2 ring-white/30 group-hover:ring-white/50 transition-all">
              {avatarEmoji}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow">
              <span className="text-xs">✏️</span>
            </div>
          </button>

          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {t('gamification.level', { level }) || `Level ${level}`}
              </span>
            </div>
            <div className="text-sm text-white/80">
              {totalXP.toLocaleString()} XP {t('gamification.total') || 'total'}
            </div>
          </div>
        </div>

        {/* XP Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-white/80">
              {t('gamification.progress') || 'Progress'}
            </span>
            <span className="font-medium">
              {Math.round(progressPercent)}% → {t('gamification.levelShort', { level: level + 1 }) || `Lv.${level + 1}`}
            </span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full transition-[width] duration-500',
                progressPercent >= 90 && 'animate-pulse'
              )}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>{(totalXP - (totalXP % xpToNextLevel)).toLocaleString()} XP</span>
            <span>{xpToNextLevel.toLocaleString()} XP {t('gamification.xpNeeded') || 'needed'}</span>
          </div>
        </div>

        {/* Bottom row: Streak + Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={cn('h-6 w-6', getStreakColor(currentStreak))} />
            <div>
              <span className="text-xl font-bold">{currentStreak}</span>
              <span className="text-sm text-white/80 ml-1">
                {t('gamification.dayStreak', { days: currentStreak }) || `day streak`}
              </span>
            </div>
            {currentStreak >= 7 && (
              <span className="px-2 py-0.5 text-xs bg-orange-500/30 rounded-full">
                🔥 {t('gamification.onFire') || 'On Fire!'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-300" />
            <span className="text-lg font-semibold">
              {badgesUnlocked}/{badgesTotal}
            </span>
            <span className="text-sm text-white/80">
              {t('gamification.badges') || 'badges'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroProgressCard
