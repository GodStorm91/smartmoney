import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gamificationService } from '@/services/gamification-service';
import { LevelProgress } from './LevelProgress';
import { StreakCounter } from './StreakCounter';
import { ProfilePage } from './ProfilePage';
import { useXPToast } from './XPToast';
import { Trophy, Star, Zap, Target, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';

export const GamificationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { addXPGain } = useXPToast();

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: () => gamificationService.getStats(),
  });

  const { data: achievementsData, refetch: refetchAchievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => gamificationService.getAchievements(),
  });

  // Track achievements unlocked during this session
  const [lastUnlockedAchievements, setLastUnlockedAchievements] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (achievementsData?.achievements) {
      // Check for newly unlocked achievements
      const unlockedIds = new Set(
        achievementsData.achievements
          .filter((a: any) => a.unlocked)
          .map((a: any) => a.id)
      );

      // Find newly unlocked achievements
      achievementsData.achievements.forEach((achievement: any) => {
        if (achievement.unlocked && !lastUnlockedAchievements.has(achievement.id)) {
          // New achievement unlocked!
          toast.success(`🏆 Achievement Unlocked: ${achievement.name}! (+${achievement.xp_reward} XP)`);
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
          toast.success(`🔥 ${result.current_streak} day streak! +${result.xp_earned} XP`);
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
    return <div className="p-8 text-center">Loading gamification data...</div>;
  }

  const progressPercentage = gamificationService.calculateLevelProgress(
    stats.total_xp,
    stats.current_level,
    stats.xp_to_next_level
  );

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
                  {achievementsData.unlocked}/{achievementsData.total}
                </div>
                <div className="text-sm text-gray-500">Achievements</div>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${(achievementsData.unlocked / achievementsData.total) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'achievements', label: 'Achievements', icon: Star },
            { id: 'challenges', label: 'Challenges', icon: Target },
            { id: 'activity', label: 'Activity', icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'profile' && <ProfilePage />}

        {activeTab === 'achievements' && (
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Your Achievements
              </h3>
              {achievementsData.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievementsData.achievements.map((a: any) => (
                    <div
                      key={a.id}
                      className={`p-4 rounded-lg border ${
                        a.unlocked
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{a.icon}</span>
                        <div>
                          <h4 className="font-medium">{a.name}</h4>
                          <p className="text-sm text-gray-500">{a.description}</p>
                          <span className="text-xs font-medium text-blue-600 mt-1 block">
                            +{a.xp_reward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No achievements yet. Start tracking your finances!
                </p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'challenges' && (
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Challenges Coming Soon
              </h3>
              <p className="text-gray-500">
                Complete daily, weekly, and monthly challenges to earn bonus XP!
              </p>
            </div>
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Recent Activity
              </h3>
              {stats.recent_xp_events.length > 0 ? (
                <div className="space-y-2">
                  {stats.recent_xp_events.map((event: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <span className="text-sm capitalize">
                        {event.action.replace(/_/g, ' ')}
                      </span>
                      <span className="font-semibold text-green-600">
                        +{event.xp_earned} XP
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No recent activity. Start logging transactions!
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GamificationDashboard;
