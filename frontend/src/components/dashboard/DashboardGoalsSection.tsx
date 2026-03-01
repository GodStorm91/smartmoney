import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Target, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MiniGoalCard } from './MiniGoalCard'

interface DashboardGoalsSectionProps {
  goalsProgress: any[] | undefined
  goalsCount: number
  formatCurrency: (amount: number, currency?: string) => string
}

export function DashboardGoalsSection({ goalsProgress, goalsCount, formatCurrency }: DashboardGoalsSectionProps) {
  const { t } = useTranslation('common')

  // Goals with progress
  if (goalsProgress && goalsProgress.length > 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-pink-100 dark:bg-pink-900/30">
              <Target className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              {t('dashboard.goals', 'Goals')}
            </h3>
          </div>
          <Link
            to="/goals"
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {goalsProgress.slice(0, 2).map((progress, idx) => (
            progress.achievability && (
              <div
                key={progress.goal_id}
                className="animate-stagger-in"
                style={{ '--stagger-index': idx } as React.CSSProperties}
              >
                <MiniGoalCard
                  years={progress.years}
                  progress={progress}
                  formatCurrency={formatCurrency}
                />
              </div>
            )
          ))}
        </div>
      </Card>
    )
  }

  // No goals at all — CTA
  if (goalsCount === 0) {
    return (
      <Link to="/goals">
        <Card className="p-4 border-2 border-dashed border-pink-200 dark:border-pink-800/40 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-100 dark:bg-pink-900/30 rounded-xl group-hover:scale-110 transition-transform">
              <Target className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {t('dashboard.createFirstGoal', 'Create your first goal')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.goalMotivation', 'Track your savings progress')}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </Card>
      </Link>
    )
  }

  return null
}
