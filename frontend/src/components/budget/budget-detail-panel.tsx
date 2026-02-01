import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  TrendingUp,
  TrendingDown,
  Plus,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fetchTransactions } from '@/services/transaction-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useCategoryTree } from '@/hooks/useCategories'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/utils/cn'
import type { Transaction, BudgetTrackingItem } from '@/types'

// Helper to convert amount to JPY
function convertToJpy(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'JPY') return amount
  const rate = rates[currency]
  if (!rate || rate === 0) return amount
  // rate_to_jpy is "units per JPY", so divide to convert to JPY
  return Math.round(amount / rate)
}

interface BudgetDetailPanelProps {
  category: string
  month: string
  trackingItem?: BudgetTrackingItem
  isOpen: boolean
  onClose: () => void
  /** 'overlay' = slide-in panel (default), 'inline' = static panel for split-view */
  mode?: 'overlay' | 'inline'
  className?: string
}

export function BudgetDetailPanel({
  category,
  month,
  trackingItem,
  isOpen,
  onClose,
  mode = 'overlay',
  className
}: BudgetDetailPanelProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const { data: categoryTree } = useCategoryTree()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previousMonthSpent, setPreviousMonthSpent] = useState<number | null>(null)

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  // Build parent to children category map
  const parentToChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!categoryTree) return map

    categoryTree.expense.forEach(parent => {
      const childNames = parent.children.map(child => child.name)
      map.set(parent.name, childNames)
    })

    categoryTree.income.forEach(parent => {
      const childNames = parent.children.map(child => child.name)
      map.set(parent.name, childNames)
    })

    return map
  }, [categoryTree])

  // Get all categories to search (parent + all children)
  const searchCategories = useMemo(() => {
    const children = parentToChildrenMap.get(category) || []
    return [category, ...children]
  }, [category, parentToChildrenMap])

  // Find parent category for breadcrumb
  const parentCategory = useMemo(() => {
    if (!categoryTree) return null
    for (const parent of [...categoryTree.expense, ...categoryTree.income]) {
      if (parent.children.some(c => c.name === category)) {
        return parent.name
      }
    }
    return null
  }, [category, categoryTree])

  // Fetch current month transactions
  useEffect(() => {
    if (!isOpen) return

    let mounted = true

    async function loadTransactions() {
      setIsLoading(true)
      setError(null)

      try {
        const [year, monthNum] = month.split('-').map(Number)
        const lastDay = new Date(year, monthNum, 0).getDate()
        const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
        const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        const data = await fetchTransactions({
          categories: searchCategories,
          start_date: startDate,
          end_date: endDate,
          type: 'expense'
        })

        if (mounted) {
          // Convert all amounts to JPY for consistent sorting
          const rates = exchangeRates?.rates || {}
          const withJpyAmount = data
            .filter(tx => !tx.is_transfer)
            .map(tx => ({
              ...tx,
              amountJpy: convertToJpy(Math.abs(tx.amount), tx.currency || 'JPY', rates)
            }))

          // Sort by JPY amount (largest first) and take top 10
          const sorted = withJpyAmount.sort((a, b) => b.amountJpy - a.amountJpy)
          setTransactions(sorted.slice(0, 10).map(({ amountJpy, ...tx }) => tx))
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load transactions')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadTransactions()

    return () => {
      mounted = false
    }
  }, [category, month, isOpen, searchCategories])

  // Fetch previous month for comparison
  useEffect(() => {
    if (!isOpen) return

    let mounted = true

    async function loadPreviousMonth() {
      try {
        const [year, monthNum] = month.split('-').map(Number)
        let prevYear = year
        let prevMonth = monthNum - 1
        if (prevMonth < 1) {
          prevMonth = 12
          prevYear -= 1
        }

        const [pYear, pMonth] = [prevYear, prevMonth]
        const lastDay = new Date(pYear, pMonth, 0).getDate()
        const startDate = `${pYear}-${String(pMonth).padStart(2, '0')}-01`
        const endDate = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        const data = await fetchTransactions({
          categories: searchCategories,
          start_date: startDate,
          end_date: endDate,
          type: 'expense'
        })

        if (mounted) {
          // Filter out transfers and calculate total in JPY
          const rates = exchangeRates?.rates || {}
          const filtered = data.filter(tx => !tx.is_transfer)
          const total = filtered.reduce((sum, tx) => {
            const jpyAmount = convertToJpy(Math.abs(tx.amount), tx.currency || 'JPY', rates)
            return sum + jpyAmount
          }, 0)
          setPreviousMonthSpent(total)
        }
      } catch {
        // Silently fail for comparison
      }
    }

    loadPreviousMonth()

    return () => {
      mounted = false
    }
  }, [category, month, isOpen, searchCategories])

  // Escape key closes overlay panel
  useEffect(() => {
    if (mode !== 'overlay' || !isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, mode, onClose])

  const formatTxDate = (dateStr: string) => {
    return formatDate(dateStr, 'MMM d')
  }

  const handleViewAll = () => {
    onClose()
    navigate({
      to: '/transactions',
      search: { categories: category, month }
    })
  }

  const handleAddTransaction = () => {
    onClose()
    // Will open transaction modal
  }

  // Calculate comparison
  const currentSpent = trackingItem?.spent || 0
  const changePercent = previousMonthSpent
    ? Math.round(((currentSpent - previousMonthSpent) / previousMonthSpent) * 100)
    : null

  if (!isOpen) return null

  // Inline mode: static panel for split-view on desktop
  if (mode === 'inline') {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header with Breadcrumb */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>{t('budget.title', 'Budget')}</span>
            <ChevronRight className="w-3 h-3 mx-1" />
            <span>{t('budget.categories', 'Categories')}</span>
            {parentCategory && (
              <>
                <ChevronRight className="w-3 h-3 mx-1" />
                <span>{parentCategory}</span>
              </>
            )}
          </nav>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{category}</h2>
        </div>
        {/* Summary */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('budget.savingsTarget')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(trackingItem?.budgeted || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.expenses')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(currentSpent)}</p>
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div className={cn('h-full rounded-full transition-all duration-500', trackingItem?.status === 'red' ? 'bg-red-500' : trackingItem?.status === 'orange' ? 'bg-orange-500' : trackingItem?.status === 'yellow' ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: `${Math.min(100, trackingItem?.percentage || 0)}%` }} />
          </div>
          {changePercent !== null && (
            <div className={cn('flex items-center gap-2 text-sm', changePercent > 0 ? 'text-red-600 dark:text-red-400' : changePercent < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500')}>
              {changePercent > 0 ? <TrendingUp className="w-4 h-4" /> : changePercent < 0 ? <TrendingDown className="w-4 h-4" /> : null}
              <span>{changePercent > 0 ? '+' : ''}{changePercent}% vs last month ({formatCurrency(previousMonthSpent || 0)})</span>
            </div>
          )}
        </div>
        {/* Transactions */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('dashboard.recentTransactions')}</h3>
          {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
           : error ? <div className="flex items-center gap-2 text-red-500 py-4"><AlertTriangle className="w-5 h-5" /><span>{error}</span></div>
           : transactions.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">{t('transactions.noData')}</p>
           : <div className="space-y-3">{transactions.map(tx => (
               <div key={tx.id} className="flex items-center justify-between py-2">
                 <div className="flex-1 min-w-0"><p className="text-sm text-gray-900 dark:text-gray-100 truncate">{tx.description}</p><p className="text-xs text-gray-500 dark:text-gray-400">{formatTxDate(tx.date)}</p></div>
                 <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4">{formatCurrency(tx.amount)}</span>
               </div>
             ))}{transactions.length >= 10 && <Button variant="ghost" size="sm" onClick={handleViewAll} className="w-full flex items-center justify-center gap-1 mt-2"><span>{t('dashboard.viewAllCategories')}</span><ExternalLink className="w-3 h-3" /></Button>}</div>}
        </div>
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button onClick={handleAddTransaction} className="w-full flex items-center justify-center gap-2"><Plus className="w-4 h-4" /><span>{t('transaction.addTransaction')}</span></Button>
          <Button variant="outline" onClick={handleViewAll} className="w-full"><span>{t('transactions.viewAll')}</span></Button>
        </div>
      </div>
    )
  }

  // Overlay mode: slide-in panel
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 shadow-xl z-50',
          'flex flex-col transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header with Breadcrumb */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              <nav className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{t('budget.title', 'Budget')}</span>
                <ChevronRight className="w-3 h-3 mx-1" />
                <span>{t('budget.categories', 'Categories')}</span>
                {parentCategory && (
                  <>
                    <ChevronRight className="w-3 h-3 mx-1" />
                    <span className="truncate">{parentCategory}</span>
                  </>
                )}
              </nav>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {category}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Summary Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('budget.savingsTarget')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(trackingItem?.budgeted || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.expenses')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(currentSpent)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                trackingItem?.status === 'red' ? 'bg-red-500' :
                trackingItem?.status === 'orange' ? 'bg-orange-500' :
                trackingItem?.status === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(100, trackingItem?.percentage || 0)}%` }}
            />
          </div>

          {/* Comparison */}
          {changePercent !== null && (
            <div className={cn(
              'flex items-center gap-2 text-sm',
              changePercent > 0 ? 'text-red-600 dark:text-red-400' :
              changePercent < 0 ? 'text-green-600 dark:text-green-400' :
              'text-gray-500'
            )}>
              {changePercent > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : changePercent < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : null}
              <span>
                {changePercent > 0 ? '+' : ''}{changePercent}% vs last month
                ({formatCurrency(previousMonthSpent || 0)})
              </span>
            </div>
          )}
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {t('dashboard.recentTransactions')}
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-red-500 py-4">
                <AlertTriangle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                {t('transactions.noData')}
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTxDate(transaction.date)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                ))}

                {transactions.length >= 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewAll}
                    className="w-full flex items-center justify-center gap-1 mt-2"
                  >
                    <span>{t('dashboard.viewAllCategories')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button
            onClick={handleAddTransaction}
            className="w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('transaction.addTransaction')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleViewAll}
            className="w-full"
          >
            <span>{t('transactions.viewAll')}</span>
          </Button>
        </div>
      </div>
    </>
  )
}
