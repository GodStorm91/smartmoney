import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { gamificationService, Achievement } from '@/services/gamification-service'
import { useProfile } from '@/services/rewards-service'
import { useXPToast } from './XPToast'
import { HeroProgressCard } from './HeroProgressCard'
import { RecentUnlocks } from './RecentUnlocks'
import { NextToUnlock } from './NextToUnlock'
import { BadgesByRarity } from './BadgesByRarity'
import { BadgeDetailSheet } from './BadgeDetailSheet'
import { ProfileBottomSheet } from './ProfileBottomSheet'
import { LevelUpModal } from './LevelUpModal'
import { toast } from 'sonner'

export function GamificationDashboard() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { addXPGain } = useXPToast()

  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null)
  const [lastUnlockedIds, setLastUnlockedIds] = useState<Set<number>>(new Set())
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number } | null>(null)

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: () => gamificationService.getStats(),
  })

  const { data: achievementsData, refetch: refetchAchievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => gamificationService.getAchievements(),
  })

  const { data: profile } = useProfile()

  // Track daily login and check for level up
  useEffect(() => {
    const trackLogin = async () => {
      try {
        const result = await gamificationService.trackLogin()
        if (result.streak_updated) {
          toast.success(t('gamification.badge.dayStreak', { days: result.current_streak, xp: result.xp_earned }))
          addXPGain(result.xp_earned, 'Daily check-in')
          refetchStats()
          refetchAchievements()
        }
        // Check for level up (if backend returns level_up data)
        if ((result as any).level_up) {
          setLevelUpData({ newLevel: (result as any).level_up.new_level })
        }
      } catch (error) {
        console.error('Failed to track login:', error)
      }
    }
    trackLogin()
  }, [])

  // Show achievement unlocked notifications
  useEffect(() => {
    if (!achievementsData?.achievements) return

    const unlockedIds = new Set(
      achievementsData.achievements.filter((a) => a.unlocked).map((a) => a.id)
    )

    achievementsData.achievements.forEach((achievement) => {
      if (achievement.unlocked && !lastUnlockedIds.has(achievement.id)) {
        toast.success(
          t('gamification.badge.achievementUnlocked', {
            name: achievement.name,
            xp: achievement.xp_reward,
          })
        )
        addXPGain(achievement.xp_reward, `Achievement: ${achievement.name}`)
      }
    })

    setLastUnlockedIds(unlockedIds)
  }, [achievementsData, lastUnlockedIds, addXPGain, t])

  if (!stats || !achievementsData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  const progressPercent = gamificationService.calculateLevelProgress(
    stats.total_xp,
    stats.current_level,
    stats.xp_to_next_level
  )

  const unlockedCount = achievementsData.achievements.filter((a) => a.unlocked).length
  const totalCount = achievementsData.achievements.length

  // Recent unlocks: last 3 unlocked badges sorted by unlock date
  const recentUnlocks = achievementsData.achievements
    .filter((a) => a.unlocked && a.unlocked_at)
    .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
    .slice(0, 3)

  // Next to unlock: badges with progress > 0 but not yet unlocked
  const nextToUnlock = achievementsData.achievements
    .filter((a) => !a.unlocked && a.progress > 0 && a.progress < 100)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2)

  const avatarEmoji = profile?.active_avatar?.emoji || profile?.active_avatar?.icon || '😊'

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      <HeroProgressCard
        level={stats.current_level}
        totalXP={stats.total_xp}
        xpToNextLevel={stats.xp_to_next_level}
        progressPercent={progressPercent}
        currentStreak={stats.current_streak}
        badgesUnlocked={unlockedCount}
        badgesTotal={totalCount}
        avatarEmoji={avatarEmoji}
        onAvatarClick={() => setShowProfileSheet(true)}
      />

      <RecentUnlocks badges={recentUnlocks} onBadgeClick={setSelectedBadge} />

      <NextToUnlock
        badges={nextToUnlock}
        onAddTransaction={() => navigate({ to: '/transactions' })}
        onBadgeClick={setSelectedBadge}
      />

      <BadgesByRarity
        achievements={achievementsData.achievements}
        onBadgeClick={setSelectedBadge}
      />

      {/* Bottom sheets */}
      <ProfileBottomSheet
        isOpen={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
      />

      <BadgeDetailSheet
        badge={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />

      {/* Level up celebration modal */}
      <LevelUpModal
        open={!!levelUpData}
        newLevel={levelUpData?.newLevel ?? 0}
        onClose={() => setLevelUpData(null)}
      />
    </div>
  )
}

export default GamificationDashboard
