import React from 'react';
import { Medal, Trophy, Star, Crown, Target, TrendingUp, DollarSign, Building, Folder, Award } from 'lucide-react';

interface Badge {
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

interface BadgeGridProps {
  badges: Badge[];
  onBadgeClick?: (badge: Badge) => void;
}

type RarityKey = 'legendary' | 'epic' | 'rare' | 'common';

const rarityConfig: Record<RarityKey, {
  bg: string;
  border: string;
  text: string;
  glow: string;
  label: string;
  colorClass: string;
}> = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
    glow: 'shadow-gray-400/50',
    label: 'Common',
    colorClass: 'bg-gray-400 bg-gray-600 text-gray-600 text-gray-400 bg-gray-500',
  },
  rare: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-700 dark:text-blue-300',
    glow: 'shadow-blue-400/50',
    label: 'Rare',
    colorClass: 'bg-blue-400 bg-blue-600 text-blue-600 text-blue-400 bg-blue-500',
  },
  epic: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-700 dark:text-purple-300',
    glow: 'shadow-purple-400/50',
    label: 'Epic',
    colorClass: 'bg-purple-400 bg-purple-600 text-purple-600 text-purple-400 bg-purple-500',
  },
  legendary: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-500 dark:border-yellow-600',
    text: 'text-yellow-700 dark:text-yellow-300',
    glow: 'shadow-yellow-400/50',
    label: 'Legendary',
    colorClass: 'bg-yellow-400 bg-yellow-600 text-yellow-600 text-yellow-400 bg-yellow-500',
  },
};

const categoryIcons: Record<string, React.ElementType> = {
  consistency: TrendingUp,
  transactions: DollarSign,
  savings: Trophy,
  budgeting: Target,
  goals: Medal,
  accounts: Building,
  organization: Folder,
  special: Award,
  milestones: Star,
  levels: Crown,
};

export function BadgeGrid({ badges, onBadgeClick }: BadgeGridProps) {
  const sortedBadges = [...badges].sort((a, b) => {
    const rarityOrder: Record<RarityKey, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
    const aRarity = (a.rarity as RarityKey) || 'common';
    const bRarity = (b.rarity as RarityKey) || 'common';
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (rarityOrder[aRarity] !== rarityOrder[bRarity]) {
      return rarityOrder[aRarity] - rarityOrder[bRarity];
    }
    return b.xp_reward - a.xp_reward;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {sortedBadges.map((badge) => {
        const config = rarityConfig[(badge.rarity as RarityKey) || 'common'];
        const CategoryIcon = categoryIcons[badge.category] || Award;
        const colors = config.colorClass.split(' ');
        
        const gradientStyle = badge.unlocked 
          ? { background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)` }
          : {};

        return (
          <div
            key={badge.id}
            onClick={() => onBadgeClick?.(badge)}
            className={`
              relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
              ${config.bg} ${config.border}
              ${badge.unlocked 
                ? 'hover:scale-105 hover:shadow-lg' 
                : 'opacity-60 grayscale'
              }
              group
            `}
          >
            <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.border} border-2 ${config.text}`}>
              {config.label}
            </div>

            <div 
              className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl shadow-lg"
              style={gradientStyle}
            >
              {badge.icon}
            </div>

            <h4 className={`font-bold text-sm text-center ${config.text} mb-1 line-clamp-1`}>
              {badge.name}
            </h4>

            <div className="text-center">
              <span className={`text-xs font-semibold ${colors[2]} dark:${colors[3]}`}>
                +{badge.xp_reward} XP
              </span>
            </div>

            {!badge.unlocked && badge.progress > 0 && badge.progress < 100 && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ width: `${badge.progress}%`, backgroundColor: colors[4].replace('bg-', '') }}
                  />
                </div>
                <p className="text-xs text-center text-gray-500 mt-1">{badge.progress}%</p>
              </div>
            )}

            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 bg-white dark:bg-gray-800 shadow-sm border ${config.border}`}>
                <CategoryIcon className={`w-3 h-3 ${config.text}`} />
                <span className={`text-xs ${config.text} capitalize`}>{badge.category}</span>
              </div>
            </div>

            {!badge.unlocked && (
              <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface BadgeCardProps {
  badge: Badge;
  showDetails?: boolean;
}

export function BadgeCard({ badge, showDetails = true }: BadgeCardProps) {
  const config = rarityConfig[(badge.rarity as RarityKey) || 'common'];
  const CategoryIcon = categoryIcons[badge.category] || Award;
  const colors = config.colorClass.split(' ');
  
  const gradientStyle = badge.unlocked 
    ? { background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)` }
    : {};

  return (
    <div className={`
      p-6 rounded-xl border-2 ${config.bg} ${config.border}
      ${badge.unlocked ? '' : 'opacity-70'}
    `}>
      <div className="flex items-start gap-4">
        <div 
          className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl shadow-lg"
          style={gradientStyle}
        >
          {badge.icon}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold text-lg ${config.text}`}>{badge.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.border} ${config.text}`}>
              {config.label}
            </span>
          </div>
          
          {showDetails && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{badge.description}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CategoryIcon className={`w-4 h-4 ${config.text}`} />
                  <span className="capitalize text-gray-500">{badge.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className={`w-4 h-4 ${colors[2]}`} />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">+{badge.xp_reward} XP</span>
                </div>
              </div>

              {badge.unlocked && badge.unlocked_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Unlocked on {new Date(badge.unlocked_at).toLocaleDateString()}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BadgeGrid;
