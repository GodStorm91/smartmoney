import { useTranslation } from 'react-i18next'
import { Copy, Sparkles, FileText, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { BudgetCopyPreview as BudgetCopyPreviewType } from '@/types'

interface BudgetCopyPreviewProps {
  preview: BudgetCopyPreviewType
  formatCurrency: (amount: number) => string
  formatMonth: (month: string) => string
  onCopy: () => void
  onGenerateAI: () => void
  onStartEmpty: () => void
  isLoading?: boolean
}

export function BudgetCopyPreview({
  preview,
  formatCurrency,
  formatMonth,
  onCopy,
  onGenerateAI,
  onStartEmpty,
  isLoading
}: BudgetCopyPreviewProps) {
  const { t } = useTranslation('common')

  const totalBudgeted = preview.spending_summary.reduce((sum, s) => sum + s.budgeted, 0)
  const totalSpent = preview.spending_summary.reduce((sum, s) => sum + s.spent, 0)
  const overBudgetCount = preview.spending_summary.filter(s => s.over_budget).length

  return (
    <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
          <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('budget.createForMonth', { month: formatMonth(preview.target_month) })}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('budget.copyFromPrevious', { month: formatMonth(preview.source_budget.month) })}
          </p>
        </div>
      </div>

      {/* Spending Summary Preview */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">{t('budget.totalBudgeted')}</span>
          <span className="font-medium">{formatCurrency(totalBudgeted)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">{t('budget.totalSpent')}</span>
          <span className="font-medium">{formatCurrency(totalSpent)}</span>
        </div>
        {overBudgetCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('budget.categoriesOverBudget', { count: overBudgetCount })}</span>
          </div>
        )}
      </div>

      {/* Category Preview (first 5) */}
      <div className="mb-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {t('budget.categoryPreview')}
        </p>
        {preview.spending_summary.slice(0, 5).map((item) => (
          <div
            key={item.category}
            className={cn(
              "flex items-center justify-between text-sm p-2 rounded",
              item.over_budget && "bg-red-50 dark:bg-red-900/20"
            )}
          >
            <span className="text-gray-700 dark:text-gray-300">{item.category}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">
                {formatCurrency(item.spent)} / {formatCurrency(item.budgeted)}
              </span>
              {item.over_budget && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
          </div>
        ))}
        {preview.spending_summary.length > 5 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            +{preview.spending_summary.length - 5} {t('budget.moreCategories')}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={onCopy}
          disabled={isLoading}
          className="w-full"
        >
          <Copy className="w-4 h-4 mr-2" />
          {t('budget.copyAndEdit')}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onGenerateAI}
            disabled={isLoading}
            className="flex-1"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t('budget.generateWithAI')}
          </Button>
          <Button
            variant="ghost"
            onClick={onStartEmpty}
            disabled={isLoading}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            {t('budget.startEmpty')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
