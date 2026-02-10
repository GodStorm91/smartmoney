import { useState, useMemo, useEffect } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, X, Filter, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonTableRow, SkeletonTransactionCard } from '@/components/ui/Skeleton'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { TransactionEditModal } from '@/components/transactions/TransactionEditModal'
import { TransactionFormModal } from '@/components/transactions/TransactionFormModal'
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal'
import { AddTransactionFAB } from '@/components/transactions/AddTransactionFAB'
import { SwipeableTransactionCard } from '@/components/transactions/SwipeableTransactionCard'
import { DeleteConfirmDialog } from '@/components/transactions/DeleteConfirmDialog'
import { BulkRecategorizeModal } from '@/components/transactions/BulkRecategorizeModal'
import { BulkDeleteConfirmDialog } from '@/components/transactions/BulkDeleteConfirmDialog'
import { ReceiptScannerModal } from '@/components/receipts/ReceiptScannerModal'
import { formatCurrencyPrivacy, formatCurrencySignedPrivacy, CURRENCY_DECIMALS, toStorageAmount } from '@/utils/formatCurrency'
import { formatDate, getCurrentMonthRange, formatDateHeader } from '@/utils/formatDate'
import { exportTransactionsCsv } from '@/utils/exportCsv'
import { fetchTransactions, deleteTransaction, bulkDeleteTransactions, bulkUpdateCategory, createTransaction } from '@/services/transaction-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAccounts } from '@/hooks/useAccounts'
import { useOfflineCreate } from '@/hooks/use-offline-mutation'
import type { Transaction, TransactionFilters } from '@/types'
import type { ReceiptData } from '@/services/receipt-service'
import { cn } from '@/utils/cn'

function getMonthDateRange(month: string): { start: string; end: string } {
  const [year, monthNum] = month.split('-').map(Number)
  const start = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const lastDay = new Date(year, monthNum, 0).getDate()
  const end = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function Transactions() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const monthRange = getCurrentMonthRange()
  const { data: accounts } = useAccounts()

  const { categories: categoriesParam, month: monthParam, accountId, fromAccounts, type: typeParam, action: actionParam } = useSearch({
    from: '/transactions',
  })

  const parsedCategories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : []

  const initialDateRange = monthParam ? getMonthDateRange(monthParam) : monthRange

  const [filters, setFilters] = useState<TransactionFilters>({
    start_date: initialDateRange.start,
    end_date: initialDateRange.end,
    categories: parsedCategories,
    source: '',
    type: typeParam || 'all',
    account_id: accountId ? Number(accountId) : undefined,
  })
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  type DatePreset = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'custom'
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth')

  const [isFilterExpanded, setIsFilterExpanded] = useState(false)

  const getDatePresetRange = (preset: DatePreset): { start: string; end: string } => {
    const today = new Date()
    let start: Date
    let end: Date = today

    switch (preset) {
      case 'today':
        start = today
        break
      case 'thisWeek':
        start = new Date(today)
        start.setDate(today.getDay() - today.getDay())
        break
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'last3Months':
        start = new Date(today.getFullYear(), today.getMonth() - 3, 1)
        break
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1)
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const range = getDatePresetRange(preset)
      setFilters(prev => ({ ...prev, start_date: range.start, end_date: range.end }))
    }
  }

  const handleAmountChange = (type: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined
    if (type === 'min') {
      setMinAmount(value)
      setFilters(prev => ({ ...prev, min_amount: numValue }))
    } else {
      setMaxAmount(value)
      setFilters(prev => ({ ...prev, max_amount: numValue }))
    }
  }

  const clearFilter = (key: keyof TransactionFilters) => {
    setFilters(prev => {
      const next = { ...prev }
      if (key === 'categories') next.categories = []
      else if (key === 'source') next.source = ''
      else if (key === 'type') next.type = 'all'
      else if (key === 'search') {
        setSearchInput('')
        next.search = undefined
      }
      else if (key === 'min_amount') {
        setMinAmount('')
        next.min_amount = undefined
      }
      else if (key === 'max_amount') {
        setMaxAmount('')
        next.max_amount = undefined
      }
      else delete (next as any)[key]
      return next
    })
  }

  const isFilterActive = (key: keyof TransactionFilters): boolean => {
    const val = filters[key]
    if (key === 'categories') return !!(val && (val as string[]).length > 0)
    if (key === 'type') return val !== 'all'
    if (key === 'source') return !!val
    if (key === 'min_amount' || key === 'max_amount') return val !== undefined
    return !!val
  }

  const activeFilterCount = [
    isFilterActive('categories'),
    isFilterActive('source'),
    isFilterActive('min_amount'),
    isFilterActive('max_amount'),
    datePreset !== 'thisMonth',
  ].filter(Boolean).length

  type SortField = 'date' | 'description' | 'category' | 'source' | 'amount'
  type SortDirection = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  type ShowCount = 50 | 100 | 'all'
  const [showCount, setShowCount] = useState<ShowCount>(50)

  const [isSorting, setIsSorting] = useState(false)

  const handleSort = (field: SortField) => {
    setIsSorting(true)
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setTimeout(() => setIsSorting(false), 150)
  }

  const handleMobileSort = (value: string) => {
    setIsSorting(true)
    const [field, direction] = value.split('-') as [SortField, SortDirection]
    setSortField(field)
    setSortDirection(direction)
    setTimeout(() => setIsSorting(false), 150)
  }

  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined }))
  }, [debouncedSearch])

  useEffect(() => {
    if (categoriesParam || monthParam || typeParam !== undefined || accountId) {
      const dateRange = monthParam ? getMonthDateRange(monthParam) : monthRange
      const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : []
      setFilters(prev => ({
        ...prev,
        categories: categories.length > 0 ? categories : prev.categories,
        start_date: dateRange.start,
        end_date: dateRange.end,
        type: typeParam || 'all',
        account_id: accountId ? Number(accountId) : undefined,
      }))
    }
  }, [categoriesParam, monthParam, typeParam, accountId])

  const handleTypeFilter = (type: 'income' | 'expense') => {
    const newType = typeParam === type ? undefined : type
    navigate({
      to: '/transactions',
      search: (prev) => ({
        ...prev,
        type: newType,
      }),
    })
  }

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkRecategorizeOpen, setIsBulkRecategorizeOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Merge accountId from URL directly into filters for the query
  // This ensures the query always uses the current URL accountId, not stale state
  const effectiveFilters = useMemo(() => ({
    ...filters,
    account_id: accountId ? Number(accountId) : filters.account_id,
  }), [filters, accountId])

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', effectiveFilters],
    queryFn: () => fetchTransactions(effectiveFilters),
  })

  useEffect(() => {
    setSelectedIds(new Set())
  }, [transactions])

  useEffect(() => {
    if (actionParam === 'add-transaction') {
      setIsAddModalOpen(true)
      navigate({ to: '/transactions', search: (prev) => ({ ...prev, action: undefined }) })
    } else if (actionParam === 'scan-receipt') {
      setIsReceiptScannerOpen(true)
      navigate({ to: '/transactions', search: (prev) => ({ ...prev, action: undefined }) })
    }
  }, [actionParam, navigate])

  useEffect(() => {
    const handleOpenAddTransaction = () => {
      setIsAddModalOpen(true)
    }
    const handleOpenReceiptScanner = () => {
      setIsReceiptScannerOpen(true)
    }

    window.addEventListener('open-add-transaction-modal', handleOpenAddTransaction)
    window.addEventListener('open-receipt-scanner', handleOpenReceiptScanner)

    return () => {
      window.removeEventListener('open-add-transaction-modal', handleOpenAddTransaction)
      window.removeEventListener('open-receipt-scanner', handleOpenReceiptScanner)
    }
  }, [])

  const createFromReceipt = useOfflineCreate(
    createTransaction,
    'transaction',
    [['transactions'], ['analytics']]
  )

  const handleReceiptScanComplete = (data: ReceiptData) => {
    if (!data.amount || !data.category) return

    const defaultAccount = accounts?.[0]
    const currency = defaultAccount?.currency || 'JPY'
    const amount = toStorageAmount(Math.abs(data.amount), currency)

    createFromReceipt.mutate({
      date: data.date || new Date().toISOString().split('T')[0],
      description: data.merchant || 'Receipt Scan',
      amount: -amount,
      currency,
      category: data.category,
      source: defaultAccount?.name || 'Unknown',
      type: 'expense',
    })
  }

  const categoryOptions = [
    { value: '食費', label: t('category.food', 'Food') },
    { value: '住宅', label: t('category.housing', 'Housing') },
    { value: '交通', label: t('category.transport', 'Transport') },
    { value: '娯楽', label: t('category.entertainment', 'Entertainment') },
    { value: '通信', label: t('category.communication', 'Communication') },
    { value: '日用品', label: t('category.daily', 'Daily Necessities') },
    { value: '医療', label: t('category.medical', 'Medical') },
    { value: '教育', label: t('category.education', 'Education') },
    { value: 'その他', label: t('category.other', 'Other') },
  ]

  const allSelected = transactions && transactions.length > 0 &&
    transactions.every(tx => selectedIds.has(tx.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions?.map(tx => tx.id) || []))
    }
  }

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setDeletingTransaction(null)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteTransactions(Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setSelectedIds(new Set())
      setIsBulkDeleteOpen(false)
    },
  })

  const bulkRecategorizeMutation = useMutation({
    mutationFn: (category: string) => bulkUpdateCategory(Array.from(selectedIds), category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setSelectedIds(new Set())
      setIsBulkRecategorizeOpen(false)
    },
  })

  const handleDeleteConfirm = () => {
    if (deletingTransaction) {
      deleteMutation.mutate(deletingTransaction.id)
    }
  }

  const handleReset = () => {
    setFilters({
      start_date: monthRange.start,
      end_date: monthRange.end,
      categories: [],
      source: '',
      type: 'all',
    })
    setSearchInput('')
    setDatePreset('thisMonth')
    setMinAmount('')
    setMaxAmount('')
    navigate({ to: '/transactions', search: {} })
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    await queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const accountFilteredTransactions = useMemo(() => {
    if (!transactions) return []
    // When account_id is in effectiveFilters, the API already filters server-side
    // No need for additional client-side filtering which may fail if account_id isn't in response
    if (effectiveFilters.account_id) return transactions
    if (!accountId) return transactions
    const targetAccountId = Number(accountId)
    return transactions.filter(tx => tx.account_id != null && Number(tx.account_id) === targetAccountId)
  }, [transactions, accountId, effectiveFilters.account_id])

  const selectedAccount = useMemo(() => {
    if (!accountId || !accounts) return null
    return accounts.find(a => a.id === Number(accountId)) || null
  }, [accountId, accounts])

  const summaryCurrency = selectedAccount?.currency || currency

  const DEFAULT_RATES: Record<string, number> = { JPY: 1, USD: 0.00667, VND: 167 }

  const { income, expense, net } = useMemo(() => {
    const txList = accountFilteredTransactions

    const toJpy = (amount: number, txCurrency: string) => {
      if (selectedAccount) {
        return amount
      }

      const decimals = CURRENCY_DECIMALS[txCurrency] ?? 0
      const actualAmount = amount / Math.pow(10, decimals)

      if (txCurrency === 'JPY') {
        return actualAmount
      }

      const rate = rates[txCurrency] ?? DEFAULT_RATES[txCurrency]
      if (!rate || rate === 0) {
        return actualAmount
      }
      return actualAmount / rate
    }

    const inc = txList
      .filter(t => t.type === 'income' && !t.is_transfer)
      .reduce((sum, t) => sum + toJpy(t.amount, t.currency || 'JPY'), 0)
    const exp = txList
      .filter(t => t.type === 'expense' && !t.is_transfer)
      .reduce((sum, t) => sum + toJpy(Math.abs(t.amount), t.currency || 'JPY'), 0)
    return { income: inc, expense: exp, net: inc - exp }
  }, [accountFilteredTransactions, selectedAccount, rates])

  const sortedTransactions = useMemo(() => {
    if (!accountFilteredTransactions.length) return []
    return [...accountFilteredTransactions].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date':
          cmp = a.date.localeCompare(b.date)
          break
        case 'description':
          cmp = a.description.localeCompare(b.description)
          break
        case 'category':
          cmp = a.category.localeCompare(b.category)
          break
        case 'source':
          cmp = a.source.localeCompare(b.source)
          break
        case 'amount':
          cmp = a.amount - b.amount
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [accountFilteredTransactions, sortField, sortDirection])

  const displayedTransactions = useMemo(() => {
    if (showCount === 'all') return sortedTransactions
    return sortedTransactions.slice(0, showCount)
  }, [sortedTransactions, showCount])

  const groupedTransactions = useMemo(() => {
    if (!displayedTransactions.length) return []
    const groups: { date: string; transactions: Transaction[] }[] = []
    let currentDate = ''

    displayedTransactions.forEach(tx => {
      if (tx.date !== currentDate) {
        currentDate = tx.date
        groups.push({ date: tx.date, transactions: [tx] })
      } else {
        groups[groups.length - 1].transactions.push(tx)
      }
    })

    return groups
  }, [displayedTransactions])

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 pb-28">
      {fromAccounts && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/accounts' })}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('backToAccounts')}
        </Button>
      )}

      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {t('transactions.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('transactions.subtitle')}</p>
      </div>

      <Card className="mb-4">
        <div className="space-y-3">
          <div className="relative">
            <Input
              placeholder={t('transactions.searchPlaceholder', 'Search transactions...')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-11"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); clearFilter('search') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isFilterExpanded || activeFilterCount > 0
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              <Filter className="w-4 h-4" />
              {t('button.filter', 'Filter')}
              {activeFilterCount > 0 && (
                <span className="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform',
                isFilterExpanded && 'rotate-180'
              )} />
            </button>

            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
              {([
                { key: 'today', label: t('date.today', 'Today') },
                { key: 'thisWeek', label: t('date.thisWeek', 'This Week') },
                { key: 'thisMonth', label: t('date.thisMonth', 'This Month') },
                { key: 'last3Months', label: t('date.last3Months', '3 Months') },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleDatePresetChange(key)}
                  className={cn(
                    'px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                    datePreset === key
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isFilterExpanded && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3 animate-slide-up">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder={t('transactions.minAmount', 'Min')}
                  value={minAmount}
                  onChange={(e) => handleAmountChange('min', e.target.value)}
                  className="h-10"
                />
                <Input
                  type="number"
                  placeholder={t('transactions.maxAmount', 'Max')}
                  value={maxAmount}
                  onChange={(e) => handleAmountChange('max', e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <MultiSelect
                    label={t('transactions.category', 'Category')}
                    options={categoryOptions}
                    selected={filters.categories || []}
                    onChange={(categories) => setFilters({ ...filters, categories })}
                    placeholder={t('transactions.allCategories', 'All')}
                  />
                </div>
                <Select
                  label={t('transactions.source', 'Source')}
                  value={filters.source || ''}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  options={[
                    { value: '', label: t('transactions.all', 'All') },
                    ...(accounts?.map(a => ({ value: a.name, label: a.name })) || []),
                  ]}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  {t('button.reset', 'Reset')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => transactions && exportTransactionsCsv(transactions, filters.start_date, filters.end_date)}
                  disabled={!transactions || transactions.length === 0}
                >
                  {t('transactions.export', 'Export')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Summary - clickable to filter by type */}
      {/* When filtering by account: amounts are in account's native currency */}
      {/* When viewing all: amounts are aggregated in JPY (base currency) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="animate-stagger-in" style={{ '--stagger-index': 0 } as React.CSSProperties}>
          <Card
            onClick={() => handleTypeFilter('income')}
            className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
              typeParam === 'income'
                ? 'ring-2 ring-green-500 dark:ring-green-400 bg-green-50/50 dark:bg-green-900/20'
                : ''
            }`}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.income')}</p>
            <p className="text-2xl font-bold font-numbers text-green-600 dark:text-green-400">
              {formatCurrencyPrivacy(income, summaryCurrency, rates, true, isPrivacyMode)}
            </p>
          </Card>
        </div>
        <div className="animate-stagger-in" style={{ '--stagger-index': 1 } as React.CSSProperties}>
          <Card
            onClick={() => handleTypeFilter('expense')}
            className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
              typeParam === 'expense'
                ? 'ring-2 ring-red-500 dark:ring-red-400 bg-red-50/50 dark:bg-red-900/20'
                : ''
            }`}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.expense')}</p>
            <p className="text-2xl font-bold font-numbers text-red-600 dark:text-red-400">
              {formatCurrencyPrivacy(expense, summaryCurrency, rates, true, isPrivacyMode)}
            </p>
          </Card>
        </div>
        <div className="animate-stagger-in" style={{ '--stagger-index': 2 } as React.CSSProperties}>
          <Card>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.difference')}</p>
            <p className="text-2xl font-bold font-numbers text-blue-600 dark:text-blue-400">
              {formatCurrencyPrivacy(net, summaryCurrency, rates, true, isPrivacyMode)}
            </p>
          </Card>
        </div>
      </div>

      {/* Show Count & Sort Controls */}
      {!isLoading && transactions && transactions.length > 0 && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            {/* Show count control */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('transactions.show', 'Show')}:</span>
              {/* Desktop: pills */}
              <div className="hidden md:flex gap-1">
                {([50, 100, 'all'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setShowCount(opt)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      showCount === opt
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {opt === 'all' ? t('transactions.showAll', 'All') : opt}
                  </button>
                ))}
              </div>
              {/* Mobile: dropdown */}
              <select
                value={showCount}
                onChange={(e) => setShowCount(e.target.value === 'all' ? 'all' : Number(e.target.value) as 50 | 100)}
                className="md:hidden px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">{t('transactions.showAll', 'All')}</option>
              </select>
            </div>

            {/* Mobile sort control */}
            <div className="flex md:hidden items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('transactions.sort', 'Sort')}:</span>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => handleMobileSort(e.target.value)}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="date-desc">{t('transactions.sortDateDesc', 'Date ↓')}</option>
                <option value="date-asc">{t('transactions.sortDateAsc', 'Date ↑')}</option>
                <option value="amount-desc">{t('transactions.sortAmountDesc', 'Amount ↓')}</option>
                <option value="amount-asc">{t('transactions.sortAmountAsc', 'Amount ↑')}</option>
              </select>
              {isSorting && (
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('transactions.showingCount', 'Showing {{shown}} of {{total}}', {
              shown: displayedTransactions.length,
              total: sortedTransactions.length
            })}
          </span>
        </div>
      )}

      {/* Transactions Table/List */}
      {isLoading ? (
        <>
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-4 w-12"></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.date')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.description')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.category')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.source')}</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.amount')}</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-24">{t('transactions.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {[...Array(5)].map((_, i) => <SkeletonTableRow key={i} />)}
              </tbody>
            </table>
          </Card>
          <div className="md:hidden space-y-3">
            {[...Array(5)].map((_, i) => <SkeletonTransactionCard key={i} />)}
          </div>
        </>
      ) : transactions && transactions.length > 0 ? (
        <div className={`transition-opacity duration-150 ${isSorting ? 'opacity-50' : 'opacity-100'}`}>
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <span className="flex items-center gap-1">
                      {t('transactions.date')}
                      {sortField === 'date' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 select-none"
                    onClick={() => handleSort('description')}
                  >
                    <span className="flex items-center gap-1">
                      {t('transactions.description')}
                      {sortField === 'description' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 select-none"
                    onClick={() => handleSort('category')}
                  >
                    <span className="flex items-center gap-1">
                      {t('transactions.category')}
                      {sortField === 'category' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 select-none"
                    onClick={() => handleSort('source')}
                  >
                    <span className="flex items-center gap-1">
                      {t('transactions.source')}
                      {sortField === 'source' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 select-none"
                    onClick={() => handleSort('amount')}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {t('transactions.amount')}
                      {sortField === 'amount' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-24">{t('transactions.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {displayedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-50">{tx.description}</td>
                    <td className="px-6 py-4"><Badge variant={tx.type === 'income' ? 'info' : 'default'}>{tx.category}</Badge></td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{tx.source}</td>
                    <td className={`px-6 py-4 text-sm font-semibold font-numbers text-right ${tx.is_transfer ? 'text-blue-500 dark:text-blue-400' : tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrencySignedPrivacy(tx.amount, tx.type, tx.currency || 'JPY', rates, true, isPrivacyMode)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingTransaction(tx)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          aria-label={t('button.edit')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-600 dark:text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingTransaction(tx)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          aria-label={t('button.delete')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-600 dark:text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile Cards */}
          <PullToRefresh onRefresh={handleRefresh} className="md:hidden">
            <div className="space-y-6 pb-20">
              {sortField === 'date' ? (
                // Grouped by date when sorting by date
                groupedTransactions.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatDateHeader(group.date)}
                      </h3>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="space-y-3">
                      {group.transactions.map((tx) => (
                        <SwipeableTransactionCard
                          key={tx.id}
                          transaction={tx}
                          onViewDetail={setViewingTransaction}
                          onEdit={setEditingTransaction}
                          onDelete={setDeletingTransaction}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Flat list when sorting by amount (or other non-date fields)
                <div className="space-y-3">
                  {displayedTransactions.map((tx) => (
                    <SwipeableTransactionCard
                      key={tx.id}
                      transaction={tx}
                      onViewDetail={setViewingTransaction}
                      onEdit={setEditingTransaction}
                      onDelete={setDeletingTransaction}
                    />
                  ))}
                </div>
              )}
            </div>
          </PullToRefresh>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
            title={t('transactions.noData')}
            description={t('transactions.noDataDescription', 'Upload a CSV file or add transactions manually to get started.')}
            action={
              <Button onClick={() => setIsAddModalOpen(true)}>
                {t('transaction.addTransaction')}
              </Button>
            }
          />
        </Card>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.selectedCount', '{{count}} selected', { count: selectedIds.size })}
            </span>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                {t('button.clearSelection', 'Clear')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsBulkRecategorizeOpen(true)}>
                {t('transactions.recategorize', 'Recategorize')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                {t('transactions.deleteSelected', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TransactionEditModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
      />

      <TransactionDetailModal
        isOpen={!!viewingTransaction}
        onClose={() => setViewingTransaction(null)}
        transaction={viewingTransaction}
        onEdit={setEditingTransaction}
        onDelete={setDeletingTransaction}
      />

      <TransactionFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultAccountId={accountId ? Number(accountId) : null}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDeleteConfirm}
        transaction={deletingTransaction}
        isDeleting={deleteMutation.isPending}
      />

      <BulkRecategorizeModal
        isOpen={isBulkRecategorizeOpen}
        onClose={() => setIsBulkRecategorizeOpen(false)}
        onConfirm={(category) => bulkRecategorizeMutation.mutate(category)}
        selectedCount={selectedIds.size}
        isLoading={bulkRecategorizeMutation.isPending}
      />

      <BulkDeleteConfirmDialog
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate()}
        selectedCount={selectedIds.size}
        isDeleting={bulkDeleteMutation.isPending}
      />

      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onScanComplete={handleReceiptScanComplete}
      />

      {/* FAB Button */}
      <AddTransactionFAB onClick={() => setIsAddModalOpen(true)} />
    </div>
  )
}
