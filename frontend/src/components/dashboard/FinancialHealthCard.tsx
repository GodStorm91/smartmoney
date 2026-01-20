import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CountUp } from '@/components/ui/CountUp'
import { useFinancialHealth } from '@/hooks/useFinancialHealth'
import { cn } from '@/utils/cn'

interface FinancialHealthCardProps {
  income: number
  expense: number
  budgetCategories?: Array<{ allocated: number; spent: number }>
  goals?: Array<{ progress: number }>
  previousScore?: number
}

export function FinancialHealthCard({
  income,
  expense,
  budgetCategories = [],
  goals = [],
  previousScore,
}: FinancialHealthCardProps) {
  const { t } = useTranslation('common')
  const [showDetails, setShowDetails] = useState(false)

  const health = useFinancialHealth({ income, expense, budgetCategories, goals })
  const scoreChange = previousScore !== undefined ? health.score - previousScore : null

  return (
    <Card className="overflow-hidden">
      {/* Header with score */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('health.title', 'Financial Health')}
          </h3>
          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Score circle */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke={health.color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(health.score / 100) * 226} 226`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: health.color }}>
                <CountUp end={health.score} duration={1000} />
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {health.grade}
              </span>
            </div>
          </div>

          {/* Score info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t(`health.grade.${health.grade}`, health.grade)}
              </span>
              {scoreChange !== null && scoreChange !== 0 && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full',
                    scoreChange > 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {scoreChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {scoreChange > 0 ? '+' : ''}{scoreChange}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {t(`health.description.${health.grade}`, 'Your finances are looking good!')}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {showDetails && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 animate-modal-in">
          {/* Breakdown bars */}
          <div className="space-y-3 mb-4">
            {/* Savings Rate */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('health.savingsRate', 'Savings Rate')}
                </span>
                <span className="font-medium">
                  {health.breakdown.savingsRate.value}% ({health.breakdown.savingsRate.score}/{health.breakdown.savingsRate.max})
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(health.breakdown.savingsRate.score / health.breakdown.savingsRate.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Budget Adherence */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('health.budgetAdherence', 'Budget Adherence')}
                </span>
                <span className="font-medium">
                  {health.breakdown.budgetAdherence.value}% ({health.breakdown.budgetAdherence.score}/{health.breakdown.budgetAdherence.max})
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(health.breakdown.budgetAdherence.score / health.breakdown.budgetAdherence.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Goal Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('health.goalProgress', 'Goal Progress')}
                </span>
                <span className="font-medium">
                  {health.breakdown.goalProgress.value}% ({health.breakdown.goalProgress.score}/{health.breakdown.goalProgress.max})
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(health.breakdown.goalProgress.score / health.breakdown.goalProgress.max) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tips */}
          {health.tips.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  {t(`health.${health.tips[0]}`, health.tips[0])}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
