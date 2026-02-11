import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Check, RotateCcw, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getLocaleTag } from '@/utils/formatDate'
import type { BudgetVersion } from '@/types'

interface BudgetVersionDropdownProps {
  versions: BudgetVersion[]
  currentVersion: number
  formatCurrency: (amount: number) => string
  onRestore: (budgetId: number) => void
  isRestoring?: boolean
}

export function BudgetVersionDropdown({
  versions,
  currentVersion,
  formatCurrency,
  onRestore,
  isRestoring
}: BudgetVersionDropdownProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)

  if (versions.length <= 1) {
    return null
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(getLocaleTag(), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors",
          "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
          isOpen && "bg-gray-100 dark:bg-gray-800"
        )}
      >
        <History className="w-4 h-4" />
        <span>v{currentVersion}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-20 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {t('budget.versionHistory')}
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={cn(
                    "px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    version.is_active && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        v{version.version}
                      </span>
                      {version.is_active && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check className="w-3 h-3" />
                          {t('budget.current')}
                        </span>
                      )}
                      {version.copied_from_id && (
                        <span className="text-xs text-gray-400">
                          ({t('budget.copied')})
                        </span>
                      )}
                    </div>

                    {!version.is_active && (
                      <button
                        onClick={() => {
                          onRestore(version.id)
                          setIsOpen(false)
                        }}
                        disabled={isRestoring}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {t('budget.restore')}
                      </button>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDate(version.created_at)}</span>
                    <span className="mx-1">·</span>
                    <span>{formatCurrency(version.total_allocated)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
