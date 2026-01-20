import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { gamificationService } from '@/services/gamification-service';
import { LevelProgress } from './LevelProgress';
import { StreakCounter } from './StreakCounter';
import { ProfilePage } from './ProfilePage';
import { BadgeGrid } from './BadgeGrid';
import { useXPToast } from './XPToast';
import { Trophy, Star, Zap, User, TrendingUp, DollarSign, Medal, Target, Award } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'all', nameKey: 'gamification.categories.all', icon: Trophy },
  { id: 'consistency', nameKey: 'gamification.categories.consistency', icon: TrendingUp },
  { id: 'transactions', nameKey: 'gamification.categories.transactions', icon: DollarSign },
  { id: 'savings', nameKey: 'gamification.categories.savings', icon: Medal },
  { id: 'budgeting', nameKey: 'gamification.categories.budgeting', icon: Target },
  { id: 'goals', nameKey: 'gamification.categories.goals', icon: Trophy },
  { id: 'accounts', nameKey: 'gamification.categories.accounts', icon: Award },
  { id: 'special', nameKey: 'gamification.categories.special', icon: Star },
  { id: 'levels', nameKey: 'gamification.categories.levels', icon: Zap },
];

export const GamificationDashboard: React.FC = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('achievements');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { addXPGain } = useXPToast();

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: () => gamificationService.getStats(),
  });

  const { data: achievementsData, refetch: refetchAchievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => gamificationService.getAchievements(),
  });

  const [lastUnlockedAchievements, setLastUnlockedAchievements] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (achievementsData?.achievements) {
      const unlockedIds = new Set(
        achievementsData.achievements
          .filter((a: any) => a.unlocked)
          .map((a: any) => a.id)
      );

      achievementsData.achievements.forEach((achievement: any) => {
        if (achievement.unlocked && !lastUnlockedAchievements.has(achievement.id)) {
          toast.success(t('gamification.badge.achievementUnlocked', { name: achievement.name, xp: achievement.xp_reward }));
          addXPGain(achievement.xp_reward, `Achievement: ${achievement.name}`);
        }
      });

      setLastUnlockedAchievements(unlockedIds);
    }
  }, [achievementsData, lastUnlockedAchievements, addXPGain]);

  useEffect(() => {
    const trackLogin = async () => {
      try {
        const result = await gamificationService.trackLogin();
        if (result.streak_updated) {
          toast.success(t('gamification.badge.dayStreak', { days: result.current_streak, xp: result.xp_earned }));
          addXPGain(result.xp_earned, 'Daily check-in');
          refetchStats();
          refetchAchievements();
        }
      } catch (error) {
        console.error('Failed to track login:', error);
      }
    };
    trackLogin();
  }, []);

  if (!stats || !achievementsData) {
    return <div className="p-8 text-center">{t('gamification.loading')}</div>;
  }

  const progressPercentage = gamificationService.calculateLevelProgress(
    stats.total_xp,
    stats.current_level,
    stats.xp_to_next_level
  );

  const filteredAchievements = categoryFilter === 'all'
    ? achievementsData.achievements
    : achievementsData.achievements.filter((a: any) => a.category === categoryFilter);

  const unlockedCount = achievementsData.achievements.filter((a: any) => a.unlocked).length;
  const totalCount = achievementsData.achievements.length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LevelProgress
          currentLevel={stats.current_level}
          totalXP={stats.total_xp}
          xpToNextLevel={stats.xp_to_next_level}
          progressPercentage={progressPercentage}
        />
        <StreakCounter
          currentStreak={stats.current_streak}
          longestStreak={stats.longest_streak}
        />
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {unlockedCount}/{totalCount}
                </div>
                <div className="text-sm text-gray-500">{t('gamification.badgesEarned')}</div>
              </div>
              <div className="relative">
                <Trophy className="h-10 w-10 text-yellow-500" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{unlockedCount}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-500"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('gamification.badgesRemaining', { count: totalCount - unlockedCount })}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'achievements', labelKey: 'gamification.tabs.badges', icon: Trophy },
            { id: 'profile', labelKey: 'gamification.tabs.profile', icon: User },
            { id: 'activity', labelKey: 'gamification.tabs.activity', icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {t(cat.nameKey)}
                </button>
              ))}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="text-sm text-green-700 dark:text-green-400">{t('gamification.stats.unlocked')}</div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-300">{unlockedCount}</div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('gamification.stats.remaining')}</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-300">{totalCount - unlockedCount}</div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
                <div className="text-sm text-yellow-700 dark:text-yellow-400">{t('gamification.stats.legendary')}</div>
                <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                  {achievementsData.achievements.filter((a: any) => a.rarity === 'legendary' && a.unlocked).length}
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <div className="text-sm text-purple-700 dark:text-purple-400">{t('gamification.stats.xpEarned')}</div>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                  {achievementsData.achievements.filter((a: any) => a.unlocked).reduce((sum: number, a: any) => sum + a.xp_reward, 0).toLocaleString()}
                </div>
              </Card>
            </div>

            {/* Badge Grid */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {categoryFilter === 'all' ? t('gamification.allBadges') : t('gamification.categoryBadges', { category: t(CATEGORIES.find(c => c.id === categoryFilter)?.nameKey || '') })}
              </h3>
              {filteredAchievements.length > 0 ? (
                <BadgeGrid badges={filteredAchievements} />
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{t('gamification.noBadges')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('gamification.keepUsing')}</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'profile' && <ProfilePage />}

        {activeTab === 'activity' && (
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                {t('gamification.recentActivity')}
              </h3>
              {stats.recent_xp_events.length > 0 ? (
                <div className="space-y-2">
                  {stats.recent_xp_events.map((event: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <span className="text-sm font-medium capitalize">
                            {event.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        +{event.xp_earned} XP
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Zap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{t('gamification.noActivity')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('gamification.startEarningXP')}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GamificationDashboard;
