import React from 'react';
import { Settings, Bell, Volume2, Share2, Trophy, Target, Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useSettings, useUpdateSettings } from '@/services/rewards-service';
import { toast } from 'sonner';

export const GamificationSettings: React.FC = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const handleToggle = (key: string) => (checked: boolean) => {
    updateSettings.mutate({ [key]: checked }, {
      onSuccess: () => toast.success('Settings updated'),
      onError: () => toast.error('Failed to update settings'),
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="mt-2 text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Gamification Settings</h2>
          <p className="text-gray-500">Customize your experience</p>
        </div>
      </div>

      {/* Notifications Section */}
      <Card>
        <div className="p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Bell className="h-5 w-5 text-blue-500" />
            Notifications
          </h3>
          <div className="space-y-3">
            <ToggleItem
              icon={<Trophy className="h-5 w-5" />}
              title="Achievement Notifications"
              description="Get notified when you unlock achievements"
              checked={settings?.achievement_notifications ?? true}
              onChange={handleToggle('achievement_notifications')}
            />
            <ToggleItem
              icon={<Flame className="h-5 w-5" />}
              title="Streak Reminders"
              description="Reminders to maintain your streak"
              checked={settings?.streak_reminders ?? true}
              onChange={handleToggle('streak_reminders')}
            />
            <ToggleItem
              icon={<Target className="h-5 w-5" />}
              title="Challenge Reminders"
              description="Reminders about active challenges"
              checked={settings?.challenge_reminders ?? true}
              onChange={handleToggle('challenge_reminders')}
            />
          </div>
        </div>
      </Card>

      {/* Sound Section */}
      <Card>
        <div className="p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Volume2 className="h-5 w-5 text-purple-500" />
            Sound & Effects
          </h3>
          <ToggleItem
            icon={<Volume2 className="h-5 w-5" />}
            title="Sound Effects"
            description="Play sounds for achievements and XP gains"
            checked={settings?.sound_effects ?? true}
            onChange={handleToggle('sound_effects')}
          />
        </div>
      </Card>

      {/* Privacy Section */}
      <Card>
        <div className="p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Share2 className="h-5 w-5 text-green-500" />
            Privacy
          </h3>
          <ToggleItem
            icon={<Share2 className="h-5 w-5" />}
            title="Share Achievements"
            description="Allow others to see your achievements"
            checked={settings?.share_achievements ?? true}
            onChange={handleToggle('share_achievements')}
          />
        </div>
      </Card>

      {/* Tips Card */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">💡 Pro Tips</h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Complete daily challenges for bonus XP</li>
            <li>• Keep your streak alive for up to 2x XP bonus</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

const ToggleItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ icon, title, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <span className={checked ? 'text-blue-600' : 'text-gray-500'}>{icon}</span>
      <div>
        <div className="font-medium">{title}</div>
        {description && <div className="text-sm text-gray-500">{description}</div>}
      </div>
    </div>
    <Switch checked={checked} onChange={onChange} />
  </div>
);

export default GamificationSettings;
