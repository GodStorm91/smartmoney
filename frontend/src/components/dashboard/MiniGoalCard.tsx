import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface MiniGoalCardProps {
  years: number
  progress: any
  formatCurrency: (amount: number) => string
}

export function MiniGoalCard({ years, progress, formatCurrency }: MiniGoalCardProps) {
  const { t } = useTranslation('common')

  const progressPct = progress.target_amount > 0
    ? Math.min(100, (progress.total_saved / progress.target_amount) * 100)
    : 0

  const isOnTrack = progress.achievability?.current_monthly_net >= progress.achievability?.required_monthly

  return (
    <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0',
        isOnTrack
          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
      )}>
        {progressPct >= 100 ? '🎉' : `${Math.round(progressPct)}%`}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {t('goals.yearGoal', { years })}
        </p>
        <p className="text-xs font-bold font-numbers text-gray-500 dark:text-gray-400 mt-0.5">
          {formatCurrency(progress.total_saved)}
        </p>
        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-2 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full animate-progress-fill',
              isOnTrack ? 'bg-green-500' : 'bg-amber-500'
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </div>
  )
}
