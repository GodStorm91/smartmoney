import { useTranslation } from 'react-i18next'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import type { Budget } from '@/types'

interface BudgetSummaryCardProps {
  budget: Budget
  totalAllocated: number
  isDraft: boolean
  previousMonth?: Budget
  onRegenerateClick: () => void
  onSaveClick: () => void
  isSaving: boolean
}

export function BudgetSummaryCard({
  budget,
  totalAllocated,
  isDraft,
  previousMonth,
  onRegenerateClick,
  onSaveClick,
  isSaving
}: BudgetSummaryCardProps) {
  const { t, i18n } = useTranslation('common')

  const budgetLang = budget.language || 'ja'
  const currentLang = i18n.language
  const isLanguageMismatch = budget.advice && budgetLang !== currentLang

  const incomeDiff = previousMonth
    ? budget.monthly_income - previousMonth.monthly_income
    : 0
  const allocatedDiff = previousMonth
    ? totalAllocated - (previousMonth.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0)
    : 0

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">{t('budget.currentBudget')}</h3>
            {isDraft && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                {t('budget.draft')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{budget.month}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRegenerateClick}>
            {t('budget.regenerate')}
          </Button>
          {isDraft && (
            <Button onClick={onSaveClick} disabled={isSaving}>
              {isSaving ? t('budget.saving') : t('budget.save')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('budget.monthlyIncome')}</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(budget.monthly_income)}
          </p>
          {previousMonth && incomeDiff !== 0 && (
            <div className={cn(
              "flex items-center gap-1 mt-1 text-xs",
              incomeDiff > 0 ? "text-green-600" : "text-red-600"
            )}>
              {incomeDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{incomeDiff > 0 ? '+' : ''}{formatCurrency(incomeDiff)}</span>
            </div>
          )}
        </div>

        {budget.savings_target !== undefined && budget.savings_target > 0 && (
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('budget.savingsTarget')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(budget.savings_target)}
            </p>
          </div>
        )}

        {budget.carry_over !== undefined && budget.carry_over !== 0 && (
          <div className={`p-4 rounded-lg ${budget.carry_over > 0 ? 'bg-teal-50 dark:bg-teal-900/30' : 'bg-orange-50 dark:bg-orange-900/30'}`}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('budget.carryOver')}</p>
            <p className={`text-2xl font-bold ${budget.carry_over > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {budget.carry_over > 0 ? '+' : ''}{formatCurrency(budget.carry_over)}
            </p>
          </div>
        )}

        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('budget.totalAllocated')}</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(totalAllocated)}
          </p>
          {previousMonth && allocatedDiff !== 0 && (
            <div className={cn(
              "flex items-center gap-1 mt-1 text-xs",
              allocatedDiff > 0 ? "text-red-600" : "text-green-600"
            )}>
              {allocatedDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{allocatedDiff > 0 ? '+' : ''}{formatCurrency(allocatedDiff)}</span>
            </div>
          )}
        </div>
      </div>

      {budget.advice && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">{t('budget.aiAdvice')}</p>
          <p className="text-amber-700 dark:text-amber-400">{budget.advice}</p>
          {isLanguageMismatch && (
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t('budget.languageMismatchNotice')}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
