import { apiClient } from './api-client';
import { useQuery } from '@tanstack/react-query';

export interface XPActionRequest {
  action: string;
  metadata?: Record<string, any>;
}

export interface XPResponse {
  xp_earned: number;
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  level_up?: {
    old_level: number;
    new_level: number;
    unlocks: string[];
  };
}

export interface LoginStreakResponse {
  streak_updated: boolean;
  current_streak: number;
  longest_streak: number;
  xp_earned: number;
  achievements_unlocked: Achievement[];
}

export interface GamificationStats {
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  current_streak: number;
  longest_streak: number;
  achievements_unlocked: number;
  achievements_total: number;
  recent_xp_events: Array<{
    action: string;
    xp_earned: number;
    timestamp: string;
  }>;
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  xp_reward: number;
  icon: string;
  rarity: string;
  unlocked: boolean;
  progress: number;
  unlocked_at?: string;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  total: number;
  unlocked: number;
}

// React Query hooks for gamification data
export function useGamificationStats() {
  return useQuery({
    queryKey: ['gamification', 'stats'],
    queryFn: async (): Promise<GamificationStats> => {
      const response = await apiClient.get<GamificationStats>('/api/gamification/stats');
      return response.data;
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['gamification', 'achievements'],
    queryFn: async (): Promise<AchievementsResponse> => {
      const response = await apiClient.get<AchievementsResponse>('/api/gamification/achievements');
      return response.data;
    },
    staleTime: 60000,
  });
}

class GamificationService {
  async trackAction(action: string, metadata?: Record<string, any>): Promise<XPResponse> {
    const response = await apiClient.post<XPResponse>('/api/gamification/action', {
      action,
      metadata: metadata || {}
    });
    return response.data;
  }

  async trackLogin(): Promise<LoginStreakResponse> {
    const response = await apiClient.post<LoginStreakResponse>('/api/gamification/login');
    return response.data;
  }

  async getStats(): Promise<GamificationStats> {
    const response = await apiClient.get<GamificationStats>('/api/gamification/stats');
    return response.data;
  }

  async getAchievements(): Promise<AchievementsResponse> {
    const response = await apiClient.get<AchievementsResponse>('/api/gamification/achievements');
    return response.data;
  }

  async initializeAchievements(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/api/gamification/initialize-achievements');
    return response.data;
  }

  // Helper method to calculate level progress percentage
  calculateLevelProgress(totalXP: number, currentLevel: number, _xpToNextLevel: number): number {
    const levelThresholds = [
      0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
      10000, 13000, 16500, 20500, 25000, 30000, 36000, 43000, 51000, 60000,
      70000, 81000, 93000, 106000, 120000, 135000, 151000, 168000, 186000, 205000
    ];

    if (currentLevel >= levelThresholds.length) {
      // For levels beyond 30
      const currentLevelXP = 205000 + ((currentLevel - 30) * 25000);
      const progressInLevel = totalXP - currentLevelXP;
      return (progressInLevel / 25000) * 100;
    }

    const currentLevelXP = levelThresholds[currentLevel - 1];
    const nextLevelXP = levelThresholds[currentLevel];
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    const progressInLevel = totalXP - currentLevelXP;
    
    return (progressInLevel / xpNeededForLevel) * 100;
  }
}

export const gamificationService = new GamificationService();