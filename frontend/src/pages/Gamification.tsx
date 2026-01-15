import React from 'react';
import { GamificationDashboard } from '@/components/gamification/GamificationDashboard';
import { Trophy } from 'lucide-react';

const GamificationPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Achievements & Rewards
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track your progress, earn XP, and unlock achievements as you manage your finances!
        </p>
      </div>
      
      <GamificationDashboard />
    </div>
  );
};

export default GamificationPage;