import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface Challenge {
  id: number;
  code: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  category?: string;
  xp_reward: number;
  icon?: string;
  requirements?: Record<string, any>;
  is_active: boolean;
  is_available: boolean;
}

export interface UserChallenge {
  id: number;
  challenge_id: number;
  challenge: Challenge;
  progress: number;
  target: number;
  status: 'active' | 'completed' | 'expired' | 'failed';
  progress_percentage: number;
  started_at: string;
  completed_at?: string;
}

class ChallengeService {
  async getAvailableChallenges(type?: string): Promise<Challenge[]> {
    const params = type ? { type } : {};
    const response = await apiClient.get<Challenge[]>('/api/challenges/available', { params });
    return response.data;
  }

  async getMyChallenges(status?: string): Promise<UserChallenge[]> {
    const params = status ? { status } : {};
    const response = await apiClient.get<UserChallenge[]>('/api/challenges/my-challenges', { params });
    return response.data;
  }

  async startChallenge(challengeId: number): Promise<UserChallenge> {
    const response = await apiClient.post<UserChallenge>('/api/challenges/start', { challenge_id: challengeId });
    return response.data;
  }

  async initializeChallenges(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/api/challenges/initialize-challenges');
    return response.data;
  }

  async initializeAllAchievements(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/api/challenges/initialize-all-achievements');
    return response.data;
  }
}

export const challengeService = new ChallengeService();

export const useChallenges = (type?: string) => {
  return useQuery({
    queryKey: ['challenges', 'available', type],
    queryFn: () => challengeService.getAvailableChallenges(type),
  });
};

export const useMyChallenges = (status?: string) => {
  return useQuery({
    queryKey: ['challenges', 'my', status],
    queryFn: () => challengeService.getMyChallenges(status),
  });
};

export const useStartChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: number) => challengeService.startChallenge(challengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
  });
};