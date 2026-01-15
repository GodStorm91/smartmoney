import React from 'react';
import { Flame, Award } from 'lucide-react';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  currentStreak,
  longestStreak
}) => {
  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-red-500';
    if (streak >= 7) return 'text-orange-500';
    if (streak >= 3) return 'text-yellow-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Flame className={`h-6 w-6 ${getStreakColor(currentStreak)}`} />
            <div>
              <div className="text-2xl font-bold">{currentStreak}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Day Streak</div>
            </div>
          </div>
          
          {currentStreak >= 7 && (
            <div className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
              🔥 On Fire!
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Award className="h-4 w-4" />
          <div>
            <div className="font-semibold">{longestStreak}</div>
            <div className="text-xs">Best</div>
          </div>
        </div>
      </div>
      
      {currentStreak > 0 && currentStreak < 7 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Keep going! {7 - currentStreak} more days to unlock Week Warrior achievement
        </div>
      )}
    </div>
  );
};