import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatCurrency'
import type { Budget } from '@/types'

interface BudgetSummaryCardProps {
  budget: Budget
  totalAllocated: number
  isDraft: boolean
  onRegenerateClick: () => void
  onSaveClick: () => void
  isSaving: boolean
}

export function BudgetSummaryCard({
  budget,
  totalAllocated,
  isDraft,
  onRegenerateClick,
  onSaveClick,
  isSaving
}: BudgetSummaryCardProps) {
  const { t } = useTranslation('common')

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">{t('budget.monthlyIncome')}</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(budget.monthly_income)}
          </p>
        </div>

        {budget.savings_target && (
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('budget.savingsTarget')}</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(budget.savings_target)}
            </p>
          </div>
        )}

        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">{t('budget.totalAllocated')}</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(totalAllocated)}
          </p>
        </div>
      </div>

      {budget.advice && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-1">{t('budget.aiAdvice')}</p>
          <p className="text-amber-700">{budget.advice}</p>
        </div>
      )}
    </Card>
  )
}
