import { Star, Trophy } from 'lucide-react'
import { useGamificationStats } from '@/services/gamification-service'

export function LevelBadge() {
  const { data: stats, isLoading } = useGamificationStats()

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/50 dark:border-amber-700/50">
        <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Lv. -</span>
      </div>
    )
  }

  const level = stats.current_level || 1
  const totalXP = stats.total_xp || 0

  // Different styles based on level
  const isHighLevel = level >= 20
  const isMidLevel = level >= 10

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/50 dark:border-amber-700/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
         title={`Level ${level} • ${totalXP.toLocaleString()} XP total`}>
      <Trophy className={`w-3.5 h-3.5 ${isHighLevel ? 'text-yellow-500' : isMidLevel ? 'text-amber-500' : 'text-amber-600'}`} />
      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Lv.{level}</span>
    </div>
  )
}

// Compact version for use in tight spaces
export function LevelBadgeCompact() {
  const { data: stats, isLoading } = useGamificationStats()

  if (isLoading || !stats) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30">
        <Star className="w-3 h-3 text-amber-500" />
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">-</span>
      </span>
    )
  }

  const level = stats.current_level || 1

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30"
          title={`Level ${level}`}>
      <Star className="w-3 h-3 text-amber-500" />
      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{level}</span>
    </span>
  )
}

export default LevelBadge
