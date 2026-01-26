import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { toast } from 'sonner';

export interface Theme {
  id: number;
  code: string;
  name: string;
  description?: string;
  type: string;
  preview_color?: string;
  icon?: string;
  unlock_level: number;
  is_premium: boolean;
}

export interface Avatar {
  id: number;
  code: string;
  name: string;
  emoji?: string;
  image_url?: string;
  unlock_level: number;
  rarity: string;
}

export interface Feature {
  id: number;
  code: string;
  name: string;
  description?: string;
  required_level: number;
  unlocked: boolean;
}

export interface Settings {
  notifications_enabled: boolean;
  achievement_notifications: boolean;
  streak_reminders: boolean;
  challenge_reminders: boolean;
  sound_effects: boolean;
  share_achievements: boolean;
}

export interface SeasonalEvent {
  name?: string;
  description?: string;
  icon?: string;
  multiplier: number;
}

class RewardsService {
  async getThemes(level: number = 1): Promise<Theme[]> {
    const response = await apiClient.get<Theme[]>('/api/rewards/themes', { params: { level } });
    return response.data;
  }

  async getMyThemes(): Promise<Theme[]> {
    const response = await apiClient.get<Theme[]>('/api/rewards/themes/my');
    return response.data;
  }

  async activateTheme(themeId: number): Promise<{ message: string }> {
    const response = await apiClient.post(`/api/rewards/themes/${themeId}/activate`);
    return response.data;
  }

  async getAvatars(level: number = 1): Promise<Avatar[]> {
    const response = await apiClient.get<Avatar[]>('/api/rewards/avatars', { params: { level } });
    return response.data;
  }

  async getMyAvatars(): Promise<Avatar[]> {
    const response = await apiClient.get<Avatar[]>('/api/rewards/avatars/my');
    return response.data;
  }

  async activateAvatar(avatarId: number): Promise<{ message: string }> {
    const response = await apiClient.post(`/api/rewards/avatars/${avatarId}/activate`);
    return response.data;
  }

  async uploadCustomAvatar(file: File): Promise<{ message: string; avatar: Avatar }> {
    console.log('[uploadCustomAvatar] Starting upload:', file.name, file.type, file.size);
    const formData = new FormData();
    formData.append('avatar', file);
    console.log('[uploadCustomAvatar] FormData created, token exists:', !!localStorage.getItem('smartmoney_access_token'));
    // Must override Content-Type to let axios set multipart/form-data with boundary
    const response = await apiClient.post('/api/rewards/avatars/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('[uploadCustomAvatar] Upload response:', response.data);
    return response.data;
  }

  async deleteAvatar(avatarId: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/api/rewards/avatars/${avatarId}`);
    return response.data;
  }

  async getProfile(): Promise<any> {
    const response = await apiClient.get('/api/rewards/profile');
    return response.data;
  }

  async updateProfile(displayName: string, bio?: string): Promise<{ message: string }> {
    const response = await apiClient.put('/api/rewards/profile', { display_name: displayName, bio });
    return response.data;
  }

  async getFeatures(): Promise<Feature[]> {
    const response = await apiClient.get<Feature[]>('/api/rewards/features');
    return response.data;
  }

  async checkFeatureAccess(featureCode: string): Promise<{ has_access: boolean }> {
    const response = await apiClient.get(`/api/rewards/features/${featureCode}/access`);
    return response.data;
  }

  async getSettings(): Promise<Settings> {
    const response = await apiClient.get<Settings>('/api/rewards/settings');
    return response.data;
  }

  async updateSettings(settings: Partial<Settings>): Promise<{ message: string }> {
    const response = await apiClient.put('/api/rewards/settings', settings);
    return response.data;
  }

  async getActiveEvent(): Promise<SeasonalEvent> {
    const response = await apiClient.get<SeasonalEvent>('/api/rewards/events/active');
    return response.data;
  }

  async getMultiplier(): Promise<any> {
    const response = await apiClient.get('/api/rewards/events/multiplier');
    return response.data;
  }

  async initializeAll(): Promise<{ message: string }> {
    const response = await apiClient.post('/api/rewards/initialize');
    return response.data;
  }
}

export const rewardsService = new RewardsService();

export const useThemes = (level: number) => useQuery({
  queryKey: ['themes', level],
  queryFn: () => rewardsService.getThemes(level),
});

export const useMyThemes = () => useQuery({
  queryKey: ['themes', 'my'],
  queryFn: () => rewardsService.getMyThemes(),
});

export const useActivateTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (themeId: number) => rewardsService.activateTheme(themeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['themes'] }),
  });
};

export const useAvatars = (level: number) => useQuery({
  queryKey: ['avatars', level],
  queryFn: () => rewardsService.getAvatars(level),
});

export const useMyAvatars = () => useQuery({
  queryKey: ['avatars', 'my'],
  queryFn: () => rewardsService.getMyAvatars(),
});

export const useActivateAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarId: number) => rewardsService.activateAvatar(avatarId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['avatars'] }),
  });
};

export const useUploadCustomAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      console.log('[useUploadCustomAvatar] Starting upload:', file.name, file.type, file.size);
      return rewardsService.uploadCustomAvatar(file);
    },
    onSuccess: (data) => {
      console.log('[useUploadCustomAvatar] Upload success:', data);
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Custom avatar uploaded!');
      // Auto-select the new custom avatar
      if (data.avatar?.id) {
        console.log('[useUploadCustomAvatar] Auto-selecting new avatar:', data.avatar.id);
        rewardsService.activateAvatar(data.avatar.id);
      }
    },
    onError: (error: any) => {
      console.error('[useUploadCustomAvatar] Upload error:', error);
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.error('Failed to upload avatar: ' + (error?.message || 'Unknown error'));
    },
  });
};

export const useDeleteAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (avatarId: number) => rewardsService.deleteAvatar(avatarId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Avatar deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete avatar: ' + (error?.response?.data?.detail || 'Unknown error'));
    },
  });
};

export const useProfile = () => useQuery({
  queryKey: ['profile'],
  queryFn: () => rewardsService.getProfile(),
});

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ displayName, bio }: { displayName: string; bio?: string }) =>
      rewardsService.updateProfile(displayName, bio),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
};

export const useFeatures = () => useQuery({
  queryKey: ['features'],
  queryFn: () => rewardsService.getFeatures(),
});

export const useFeatureAccess = (featureCode: string) => useQuery({
  queryKey: ['feature', featureCode],
  queryFn: () => rewardsService.checkFeatureAccess(featureCode),
  enabled: !!featureCode,
});

export const useSettings = () => useQuery({
  queryKey: ['settings'],
  queryFn: () => rewardsService.getSettings(),
});

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<Settings>) => rewardsService.updateSettings(settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
};

export const useActiveEvent = () => useQuery({
  queryKey: ['active-event'],
  queryFn: () => rewardsService.getActiveEvent(),
});

export const useInitializeRewards = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rewardsService.initializeAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });
};

export const useGamificationStats = () => useQuery({
  queryKey: ['gamification-stats'],
  queryFn: () => {
    // Import dynamically to avoid circular dependency
    return import('./gamification-service').then(m => m.gamificationService.getStats());
  },
});