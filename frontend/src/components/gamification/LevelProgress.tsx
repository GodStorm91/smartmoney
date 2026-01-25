/**
 * @deprecated Use HeroProgressCard instead. This component is merged into the new single-page gamification layout.
 * Will be removed in future version.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/Progress';
import { Trophy, TrendingUp } from 'lucide-react';

interface LevelProgressProps {
  currentLevel: number;
  totalXP: number;
  xpToNextLevel: number;
  progressPercentage: number;
}

export const LevelProgress: React.FC<LevelProgressProps> = ({
  currentLevel,
  totalXP,
  xpToNextLevel,
  progressPercentage
}) => {
  const { t } = useTranslation('common');
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="text-lg font-semibold">{t('gamification.levelProgress', { level: currentLevel })}</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {totalXP.toLocaleString()} XP
        </div>
      </div>
      
      <Progress value={progressPercentage} className="h-3 mb-2" />
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {t('gamification.xpToNextLevel', { next: currentLevel + 1, percent: Math.round(progressPercentage) })}
        </span>
        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {xpToNextLevel.toLocaleString()} XP {t('gamification.xpNeeded') || 'needed'}
        </span>
      </div>
    </div>
  );
};