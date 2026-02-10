import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Sparkles, FileText, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BudgetGenerateForm } from './budget-generate-form'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/utils/cn'
import type { BudgetCopyPreview as CopyPreviewType, BudgetSuggestions, Budget } from '@/types'

type WizardStep = 'choose' | 'copy' | 'generate' | 'empty'

interface BudgetCreationWizardProps {
  copyPreview: CopyPreviewType | undefined
  isCopyPreviewLoading: boolean
  suggestions?: BudgetSuggestions
  selectedMonth: string
  formatCurrency: (amount: number) => string
  formatMonth: (month: string) => string
  onCopy: () => void
  onGenerate: (income: number) => void
  onStartEmpty: () => void
  isCopyLoading: boolean
  isGenerateLoading: boolean
  generateError: boolean
}

export function BudgetCreationWizard({
  copyPreview,
  isCopyPreviewLoading,
  suggestions,
  selectedMonth,
  formatCurrency,
  formatMonth,
  onCopy,
  onGenerate,
  onStartEmpty,
  isCopyLoading,
  isGenerateLoading,
  generateError,
}: BudgetCreationWizardProps) {
  const { t } = useTranslation('common')
  const [step, setStep] = useState<WizardStep>('choose')

  if (isCopyPreviewLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <LoadingSpinner />
      </Card>
    )
  }

  if (step === 'generate') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setStep('choose')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1 -ml-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <BudgetGenerateForm
          onGenerate={onGenerate}
          isLoading={isGenerateLoading}
          error={generateError}
          suggestions={suggestions}
        />
      </div>
    )
  }

  if (step === 'copy' && copyPreview) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setStep('choose')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1 -ml-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {t('budget.copyFromPrevious', { month: formatMonth(copyPreview.source_budget.month) })}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('budget.wizard.copyDescription')}
          </p>
          {/* Quick summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('budget.totalBudgeted')}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(copyPreview.spending_summary.reduce((s, i) => s + i.budgeted, 0))}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('budget.categories')}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {copyPreview.spending_summary.length}
              </p>
            </div>
          </div>
          <Button onClick={onCopy} loading={isCopyLoading} className="w-full">
            <Copy className="w-4 h-4 mr-2" />
            {t('budget.copyAndEdit')}
          </Button>
        </Card>
      </div>
    )
  }

  // Step 1: Choose method
  const hasPrevious = !!copyPreview
  const options = [
    ...(hasPrevious
      ? [{
          id: 'copy' as const,
          icon: Copy,
          title: t('budget.wizard.copyTitle'),
          description: t('budget.wizard.copyHint', { month: formatMonth(copyPreview!.source_budget.month) }),
          accent: 'blue' as const,
        }]
      : []),
    {
      id: 'generate' as const,
      icon: Sparkles,
      title: t('budget.wizard.aiTitle'),
      description: t('budget.wizard.aiHint'),
      accent: 'purple' as const,
    },
    {
      id: 'empty' as const,
      icon: FileText,
      title: t('budget.wizard.emptyTitle'),
      description: t('budget.wizard.emptyHint'),
      accent: 'gray' as const,
    },
  ]

  const accentStyles = {
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700',
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700',
    gray: 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600',
  }

  const iconStyles = {
    blue: 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300',
    purple: 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('budget.wizard.title', { month: formatMonth(selectedMonth) })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('budget.wizard.subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              onClick={() => {
                if (opt.id === 'empty') {
                  onStartEmpty()
                } else {
                  setStep(opt.id)
                }
              }}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
                'active:scale-[0.98]',
                accentStyles[opt.accent]
              )}
            >
              <div className={cn('p-2.5 rounded-xl flex-shrink-0', iconStyles[opt.accent])}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{opt.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
