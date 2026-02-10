import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

interface AiCategorizeReviewFooterProps {
  createRules: boolean
  onCreateRulesChange: (value: boolean) => void
  selectedCount: number
  noneSelected: boolean
  isApplying: boolean
  applyError: boolean
  onApply: () => void
  onClose: () => void
}

export function AiCategorizeReviewFooter({
  createRules,
  onCreateRulesChange,
  selectedCount,
  noneSelected,
  isApplying,
  applyError,
  onApply,
  onClose,
}: AiCategorizeReviewFooterProps) {
  const { t } = useTranslation('common')

  return (
    <div className={cn('mt-4 pt-4 border-t border-gray-200 dark:border-gray-700', 'flex flex-col gap-3')}>
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('ai.createRulesAuto')}</span>
        <Switch checked={createRules} onChange={onCreateRulesChange} />
      </label>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isApplying}>
          {t('cancel')}
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          disabled={noneSelected || isApplying}
          loading={isApplying}
        >
          <Sparkles className="w-4 h-4" />
          {t('budget.aiCategorize.apply', { count: selectedCount })}
        </Button>
      </div>

      {applyError && (
        <p className="text-sm text-red-600 dark:text-red-400 text-right">{t('ai.applyError')}</p>
      )}
    </div>
  )
}

export function ReviewLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          <Skeleton className="w-5 h-5 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="w-36 h-4" />
              <Skeleton className="w-14 h-5 rounded-full" />
            </div>
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-28 h-6 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
