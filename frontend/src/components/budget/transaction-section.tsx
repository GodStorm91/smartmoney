import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fetchTransactions } from '@/services/transaction-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useCategoryTree } from '@/hooks/useCategories'
import type { Transaction } from '@/types'

// Helper to convert amount to JPY
function convertToJpy(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'JPY') return amount
  const rate = rates[currency]
  if (!rate || rate === 0) return amount
  // rate_to_jpy is "units per JPY", so divide to convert to JPY
  return Math.round(amount / rate)
}

interface TransactionSectionProps {
  category: string
  month: string
  onViewAll?: () => void
  className?: string
}

export function TransactionSection({
  category,
  month,
  onViewAll,
  className
}: TransactionSectionProps) {
  const { t, i18n } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const { data: categoryTree } = useCategoryTree()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    let mounted = true

    async function loadTransactions() {
      setIsLoading(true)
      setError(null)

      try {
        // Calculate date range for the month
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

        // Filter out transfers
        const filtered = data.filter(tx => !tx.is_transfer)

        // Convert all amounts to JPY for consistent sorting
        const rates = exchangeRates?.rates || {}
        const withJpyAmount = filtered.map(tx => ({
          ...tx,
          amountJpy: convertToJpy(Math.abs(tx.amount), tx.currency || 'JPY', rates)
        }))

        // Sort by JPY amount (largest first) and take top 5
        const sorted = withJpyAmount.sort((a, b) => b.amountJpy - a.amountJpy)
        setTransactions(sorted.slice(0, 5).map(({ amountJpy, ...tx }) => tx))
      } catch (err) {
        if (mounted) {
          setError('Failed to load transactions')
          console.error('Error loading transactions:', err)
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
  }, [category, month, searchCategories])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return t('common.today')
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('common.previous')
    }

    return date.toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatMerchant = (description: string) => {
    // Truncate long descriptions
    if (description.length > 20) {
      return description.substring(0, 18) + '...'
    }
    return description
  }

  if (isLoading) {
    return (
      <div className={`py-4 px-4 ${className || ''}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`py-4 px-4 ${className || ''}`}>
        <p className="text-sm text-red-500 text-center">{error}</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className={`py-4 px-4 ${className || ''}`}>
        <p className="text-sm text-gray-500 text-center mb-2">
          {t('transactions.noData')}
        </p>
        <p className="text-xs text-gray-400 text-center">
          Category: {category}
        </p>
        <p className="text-xs text-gray-400 text-center">
          Month: {month}
        </p>
      </div>
    )
  }

  return (
    <div className={`py-4 px-4 space-y-2 ${className || ''}`}>
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
              {formatDate(transaction.date)}
            </span>
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
              {formatMerchant(transaction.description)}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4 flex-shrink-0">
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      ))}

      {onViewAll && transactions.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="w-full mt-3 flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <span>{t('dashboard.viewAllCategories')}</span>
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
