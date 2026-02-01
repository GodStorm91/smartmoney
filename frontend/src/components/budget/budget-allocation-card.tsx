import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Pencil, Trash2, ArrowUp, ArrowDown, Flame, Check, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import type { BudgetAllocation, BudgetTrackingItem } from '@/types'

export interface TopTransaction {
  id: number
  description: string
  amount: number
  currency: string
  date: string
  amountJpy: number
  isBig: boolean
}

interface AllocationCardProps {
  allocation: BudgetAllocation
  totalBudget: number
  trackingItem?: BudgetTrackingItem
  topTransactions?: TopTransaction[]
  isDraft?: boolean
  isUpdating?: boolean
  isDeleting?: boolean
  formatCurrency: (amount: number) => string
  onAmountChange: (newAmount: number) => void
  onDelete: () => void
  onCategoryClick: () => void
  onQuickAdjust: (adjustment: number | 'percent') => void
}

export function AllocationCard({
  allocation,
  totalBudget,
  trackingItem,
  topTransactions = [],
  isDraft,
  isUpdating,
  isDeleting,
  formatCurrency,
  onAmountChange,
  onDelete,
  onCategoryClick,
  onQuickAdjust
}: AllocationCardProps) {
  const { t } = useTranslation('common')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Format number with thousand separators
  const formatWithCommas = (value: string): string => {
    const num = value.replace(/[^\d]/g, '')
    if (!num) return ''
    return parseInt(num, 10).toLocaleString()
  }

  // Parse formatted string back to number
  const parseFormattedValue = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, ''), 10) || 0
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(allocation.amount.toLocaleString())
    setIsEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleSave = () => {
    const newAmount = parseFormattedValue(editValue)
    if (newAmount !== allocation.amount) {
      onAmountChange(newAmount)
    }
    setIsEditing(false)
  }

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIsEditing(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWithCommas(e.target.value)
    setEditValue(formatted)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  const percentage = totalBudget > 0 ? (allocation.amount / totalBudget) * 100 : 0

  const spent = trackingItem?.spent || 0
  const budgeted = trackingItem?.budgeted || allocation.amount
  const remaining = budgeted - spent
  const spentPercent = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
  const isOverBudget = spent > budgeted
  const overAmount = spent - budgeted

  const getProgressBarColor = () => {
    if (isOverBudget) return 'bg-red-500'
    if (spentPercent >= 80) return 'bg-orange-500'
    if (spentPercent >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleCardClick = () => {
    if (!isDraft && !showDeleteConfirm) {
      onCategoryClick()
    }
  }

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        isDraft
          ? "border-dashed border-blue-300 dark:border-blue-700"
          : "cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
        (isUpdating || isDeleting) && "opacity-50 pointer-events-none"
      )}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h4 className="font-semibold dark:text-gray-100 truncate">{allocation.category}</h4>
          {trackingItem && isOverBudget && (
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-label={t('budget.overBudget')} />
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-28 text-right text-lg font-bold border-2 border-blue-400 rounded px-2 py-1 dark:bg-gray-700 dark:border-blue-500 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                aria-label={t('budget.editAmount', 'Edit amount')}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSave() }}
                className="p-1.5 bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60 rounded-lg transition-colors"
                aria-label={t('save', 'Save')}
              >
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                aria-label={t('cancel', 'Cancel')}
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          ) : (
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {formatCurrency(allocation.amount)}
            </span>
          )}

          {isDraft && !isEditing && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onQuickAdjust(-5000) }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Decrease by 5000"
              >
                <ArrowDown className="w-3 h-3 text-gray-500" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onQuickAdjust(5000) }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Increase by 5000"
              >
                <ArrowUp className="w-3 h-3 text-gray-500" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onQuickAdjust('percent') }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Increase by 10%"
              >
                <span className="text-xs font-medium text-gray-500">+10%</span>
              </button>
            </>
          )}

          {!isEditing && (
            <button
              onClick={handleEditClick}
              className="p-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
              aria-label={t('budget.editAmount', 'Edit amount')}
            >
              <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </button>
          )}

          <button
            onClick={handleDeleteClick}
            className="p-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
            aria-label={t('budget.deleteAllocation', 'Delete')}
          >
            <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
            {t('budget.deleteConfirm', 'Delete this category?')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancelDelete}
              className="flex-1 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              {t('delete')}
            </button>
          </div>
        </div>
      )}

      {allocation.reasoning && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{allocation.reasoning}</p>
      )}

      <div className="mt-2">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {percentage.toFixed(1)}% {t('budget.ofTotal')}
        </p>
      </div>

      {trackingItem && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              {formatCurrency(spent)} / {formatCurrency(budgeted)}
            </span>
            <span className={cn(
              'font-medium',
              isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            )}>
              {isOverBudget ? (
                <>{t('budget.overBy', { amount: formatCurrency(overAmount) })}</>
              ) : (
                <>{formatCurrency(remaining)} {t('budget.remaining')}</>
              )}
            </span>
          </div>

          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', getProgressBarColor())}
              style={{ width: `${Math.min(spentPercent, 100)}%` }}
            />
          </div>

          {isOverBudget && (
            <div className="h-1 bg-red-200 dark:bg-red-900/50 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{ width: `${Math.min(((spent - budgeted) / budgeted) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Top Transactions Preview */}
      {!isDraft && topTransactions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t('budget.topSpending', 'Top Spending')}
          </p>
          <div className="space-y-1.5">
            {topTransactions.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className={cn(
                  'flex items-center justify-between text-sm py-1 px-2 rounded',
                  tx.isBig && 'bg-red-50 dark:bg-red-900/20'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {tx.isBig && (
                    <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  )}
                  <span className="truncate text-gray-700 dark:text-gray-300">
                    {tx.description}
                  </span>
                </div>
                <span className={cn(
                  'font-medium ml-2 whitespace-nowrap',
                  tx.isBig ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
