import React, { useState } from 'react';
import { User, Crown, Star, Edit2, Sparkles, Palette, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useProfile, useThemes, useAvatars, useGamificationStats } from '@/services/rewards-service';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  epic: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300',
  legendary: 'bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300',
};

export const ProfilePage: React.FC = () => {
  const { data: profile } = useProfile();
  const { data: gamificationStats } = useGamificationStats ? useGamificationStats() : { data: null };
  const { data: themes = [] } = useThemes(1);
  const { data: avatars = [] } = useAvatars(1);
  const { activeTheme, activateTheme, isLoading: themeLoading } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [activatingThemeId, setActivatingThemeId] = useState<number | null>(null);

  const level = gamificationStats?.current_level || profile?.level || 1;
  const totalXP = gamificationStats?.total_xp || profile?.total_xp || 0;

  const handleSave = () => {
    toast.success('Profile updated!');
    setIsEditing(false);
  };

  const handleThemeSelect = async (themeId: number) => {
    if (themeLoading || activatingThemeId === themeId) return;
    
    setActivatingThemeId(themeId);
    try {
      await activateTheme(themeId);
      toast.success('Theme activated!');
    } catch (error) {
      toast.error('Failed to activate theme');
    } finally {
      setActivatingThemeId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-500">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Profile & Customization</h2>
          <p className="text-gray-500">Personalize your experience</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="relative px-6 pb-6">
          <div className="absolute -top-12 left-6">
            <div className="h-24 w-24 rounded-full bg-white dark:bg-gray-800 p-1 shadow-xl">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-4xl">😊</span>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-6">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="font-bold text-lg">Level {level}</span>
            </div>
          </div>
          <div className="mt-14">
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display Name"
                  className="max-w-xs"
                />
                <Button onClick={handleSave} size="sm">Save</Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{profile?.display_name || 'New User'}</h2>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                {totalXP.toLocaleString()} XP
              </span>
              {profile?.title && (
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">{profile.title}</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Avatar Selection */}
      <Card>
        <div className="p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <User className="h-5 w-5 text-blue-500" />
            Select Avatar
          </h3>
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
            {avatars.map((avatar: any) => {
              const isAvailable = avatar.unlock_level <= level;
              return (
                <div
                  key={avatar.id}
                  className={`aspect-square rounded-xl flex items-center justify-center text-3xl cursor-pointer transition-all ${
                    isAvailable ? rarityColors[avatar.rarity] : 'opacity-50 bg-gray-100'
                  }`}
                  title={isAvailable ? avatar.name : `Unlock at level ${avatar.unlock_level}`}
                >
                  {avatar.emoji || '😊'}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Theme Selection */}
      <Card>
        <div className="p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Palette className="h-5 w-5 text-purple-500" />
            Choose Theme
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {themes.map((theme: any) => {
              const isAvailable = theme.unlock_level <= level;
              const isActive = theme.id === activatingThemeId || 
                (activeTheme === theme.code && !activatingThemeId);
              
              return (
                <div
                  key={theme.id}
                  onClick={() => isAvailable && handleThemeSelect(theme.id)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isAvailable ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                  } ${isActive ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-transparent'}`}
                  style={{ backgroundColor: theme.preview_color || '#f3f4f6' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{theme.icon || '🎨'}</span>
                    <span className="font-medium text-sm">{theme.name}</span>
                  </div>
                  {isActive && (
                    <div className="absolute -top-2 -right-2 bg-primary-500 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  {!isAvailable && (
                    <div className="text-center mt-2">
                      <span className="text-xs bg-white/90 dark:bg-gray-900/90 rounded-full px-2 py-1">
                        Lv.{theme.unlock_level}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Unlockable Features */}
      <Card>
        <div className="p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Unlock at Higher Levels
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'Advanced Analytics', level: 10, icon: '📊' },
              { name: 'AI Insights', level: 15, icon: '🤖' },
              { name: 'API Access', level: 20, icon: '🔌' },
              { name: 'Tax Reports', level: 18, icon: '📋' },
            ].map((feature) => (
              <div
                key={feature.name}
                className={`p-3 rounded-lg border text-center ${
                  level >= feature.level
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-2xl">{feature.icon}</span>
                <p className="text-sm font-medium mt-1">{feature.name}</p>
                <p className="text-xs text-gray-500">Lv. {feature.level}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
