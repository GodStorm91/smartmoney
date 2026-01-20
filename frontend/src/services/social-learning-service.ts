import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface Quiz {
  id: number;
  code: string;
  title: string;
  description: string;
  topic: string;
  difficulty: string;
  xp_reward: number;
  time_limit?: number;
  passing_score: number;
  questions_count: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  order: number;
}

export interface QuizSubmit {
  quiz_id: number;
  answers: number[];
  time_taken?: number;
}

export interface QuizResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  xp_earned: any;
}

export interface LearningPath {
  id: number;
  code: string;
  title: string;
  description: string;
  difficulty: string;
  xp_reward: number;
  icon?: string;
  modules_count: number;
  total_duration?: number;
}

export interface LearningModule {
  id: number;
  title: string;
  content: string;
  duration_minutes?: number;
  xp_reward: number;
}

export interface LeaderboardEntry {
  rank: number;
  percentile: number;
  value: number;
}

export interface SocialGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  join_code?: string;
}

class SocialLearningService {
  async getQuizzes(topic?: string): Promise<Quiz[]> {
    const params = topic ? { topic } : {};
    const response = await apiClient.get<Quiz[]>('/api/social/quizzes', { params });
    return response.data;
  }

  async getQuiz(id: number): Promise<any> {
    const response = await apiClient.get(`/api/social/quizzes/${id}`);
    return response.data;
  }

  async submitQuiz(data: QuizSubmit): Promise<QuizResult> {
    const response = await apiClient.post<QuizResult>('/api/social/quizzes/submit', data);
    return response.data;
  }

  async initializeQuizzes(): Promise<{ message: string }> {
    const response = await apiClient.post('/api/social/quizzes/initialize');
    return response.data;
  }

  async getLearningPaths(): Promise<LearningPath[]> {
    const response = await apiClient.get<LearningPath[]>('/api/social/learning-paths');
    return response.data;
  }

  async getLearningPath(id: number): Promise<any> {
    const response = await apiClient.get(`/api/social/learning-paths/${id}`);
    return response.data;
  }

  async startLearningPath(id: number): Promise<any> {
    const response = await apiClient.post(`/api/social/learning-paths/${id}/start`);
    return response.data;
  }

  async completeModule(pathId: number, moduleId: number): Promise<any> {
    const response = await apiClient.post(`/api/social/learning-paths/${pathId}/modules/${moduleId}/complete`);
    return response.data;
  }

  async initializeLearningPaths(): Promise<{ message: string }> {
    const response = await apiClient.post('/api/social/learning-paths/initialize');
    return response.data;
  }

  async getLeaderboard(metric: string = 'savings_rate', period: string = 'monthly'): Promise<{ entries: LeaderboardEntry[] }> {
    const response = await apiClient.get('/api/social/leaderboard', { params: { metric, period } });
    return response.data;
  }

  async createGroup(name: string, description: string): Promise<SocialGroup> {
    const response = await apiClient.post<SocialGroup>('/api/social/groups/create', { name, description });
    return response.data;
  }

  async joinGroup(joinCode: string): Promise<SocialGroup> {
    const response = await apiClient.post<SocialGroup>('/api/social/groups/join', { join_code: joinCode });
    return response.data;
  }

  async getMyGroups(): Promise<SocialGroup[]> {
    const response = await apiClient.get<SocialGroup[]>('/api/social/groups/my');
    return response.data;
  }

  async initializeGroups(): Promise<{ message: string }> {
    const response = await apiClient.post('/api/social/groups/initialize');
    return response.data;
  }
}

export const socialLearningService = new SocialLearningService();

export const useQuizzes = (topic?: string) => useQuery({
  queryKey: ['quizzes', topic],
  queryFn: () => socialLearningService.getQuizzes(topic),
});

export const useQuiz = (id: number) => useQuery({
  queryKey: ['quiz', id],
  queryFn: () => socialLearningService.getQuiz(id),
  enabled: !!id,
});

export const useSubmitQuiz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QuizSubmit) => socialLearningService.submitQuiz(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quizzes'] }),
  });
};

export const useLearningPaths = () => useQuery({
  queryKey: ['learning-paths'],
  queryFn: () => socialLearningService.getLearningPaths(),
});

export const useLearningPath = (id: number) => useQuery({
  queryKey: ['learning-path', id],
  queryFn: () => socialLearningService.getLearningPath(id),
  enabled: !!id,
});

export const useStartLearningPath = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => socialLearningService.startLearningPath(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-paths'] }),
  });
};

export const useCompleteModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pathId, moduleId }: { pathId: number; moduleId: number }) =>
      socialLearningService.completeModule(pathId, moduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-paths'] }),
  });
};

export const useLeaderboard = (metric: string, period: string) => useQuery({
  queryKey: ['leaderboard', metric, period],
  queryFn: () => socialLearningService.getLeaderboard(metric, period),
});

export const useMyGroups = () => useQuery({
  queryKey: ['groups', 'my'],
  queryFn: () => socialLearningService.getMyGroups(),
});

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      socialLearningService.createGroup(name, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
};

export const useJoinGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (joinCode: string) => socialLearningService.joinGroup(joinCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
};