import React from 'react';
import { useTranslation } from 'react-i18next';
import { GamificationDashboard } from '@/components/gamification/GamificationDashboard';
import { Trophy } from 'lucide-react';

const GamificationPage: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          {t('gamification.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('gamification.subtitle')}
        </p>
      </div>
      
      <GamificationDashboard />
    </div>
  );
};

export default GamificationPage;