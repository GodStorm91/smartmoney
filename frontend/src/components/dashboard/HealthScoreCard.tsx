import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import type { HealthScore } from '@/services/health-score-service'

interface HealthScoreCardProps {
  data: HealthScore
}

const COMPONENT_KEYS: Record<string, string> = {
  savings_rate: 'healthScore.savingsRate',
  budget_adherence: 'healthScore.budgetAdherence',
  debt_ratio: 'healthScore.debtRatio',
  emergency_fund: 'healthScore.emergencyFund',
  goal_progress: 'healthScore.goalProgress',
  consistency: 'healthScore.consistency',
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-income-600 dark:text-income-300'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-expense-600 dark:text-expense-300'
}

function strokeColor(score: number): string {
  if (score >= 70) return 'stroke-income-500'
  if (score >= 50) return 'stroke-amber-500'
  return 'stroke-expense-500'
}

function barBg(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.7) return 'bg-income-500'
  if (pct >= 0.5) return 'bg-amber-500'
  return 'bg-expense-500'
}

function getGradeLabelKey(grade: string): { key: string; fallback: string } {
  if (grade === 'A+' || grade === 'A') return { key: 'healthScore.excellent', fallback: 'Excellent' }
  if (grade === 'B+' || grade === 'B') return { key: 'healthScore.good', fallback: 'Good' }
  if (grade === 'C') return { key: 'healthScore.fair', fallback: 'Fair' }
  return { key: 'healthScore.needsWork', fallback: 'Needs Work' }
}

export function HealthScoreCard({ data }: HealthScoreCardProps) {
  const { t } = useTranslation('common')
  const [expanded, setExpanded] = useState(false)

  const { score, grade, components, tips } = data

  // SVG circle params
  const size = 120
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <Card className="p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-[0.12em]">
          {t('healthScore.title', 'Financial Health')}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>
      </div>

      {/* Score Ring */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-100 dark:text-gray-700/60"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn('transition-all duration-700 ease-out', strokeColor(score))}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-3xl font-extrabold font-numbers tracking-tight', scoreColor(score))}>
              {score}
            </span>
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full mt-0.5',
              score >= 70 ? 'bg-income-100 text-income-700 dark:bg-income-900/20 dark:text-income-300'
                : score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                : 'bg-expense-100 text-expense-700 dark:bg-expense-900/20 dark:text-expense-300'
            )}>
              {grade}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
          {t(getGradeLabelKey(grade).key, getGradeLabelKey(grade).fallback)}
        </p>
      </div>

      {/* Expanded: Component Breakdown + Tips */}
      {expanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Component bars */}
          <div className="space-y-2.5">
            {components.map((comp) => {
              const pct = comp.max > 0 ? (comp.score / comp.max) * 100 : 0
              return (
                <div key={comp.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      {t(COMPONENT_KEYS[comp.name] || comp.name)}
                    </span>
                    <span className="text-[11px] font-bold font-numbers text-gray-500 dark:text-gray-400">
                      {Math.round(comp.score)}/{comp.max}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', barBg(comp.score, comp.max))}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {comp.detail}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Tips */}
          {tips.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-[0.12em] mb-2">
                {t('healthScore.tips', 'Improvement Tips')}
              </p>
              <div className="space-y-1.5">
                {tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
