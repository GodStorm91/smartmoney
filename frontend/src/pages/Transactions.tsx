import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonTableRow, SkeletonTransactionCard } from '@/components/ui/Skeleton'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { TransactionEditModal } from '@/components/transactions/TransactionEditModal'
import { TransactionFormModal } from '@/components/transactions/TransactionFormModal'
import { QuickEntryFAB } from '@/components/transactions/QuickEntryFAB'
import { SwipeableTransactionCard } from '@/components/transactions/SwipeableTransactionCard'
import { DeleteConfirmDialog } from '@/components/transactions/DeleteConfirmDialog'
import { BulkRecategorizeModal } from '@/components/transactions/BulkRecategorizeModal'
import { BulkDeleteConfirmDialog } from '@/components/transactions/BulkDeleteConfirmDialog'
import { formatCurrencyPrivacy, formatCurrencySignedPrivacy } from '@/utils/formatCurrency'
import { formatDate, getCurrentMonthRange, formatDateHeader } from '@/utils/formatDate'
import { exportTransactionsCsv } from '@/utils/exportCsv'
import { fetchTransactions, deleteTransaction, bulkDeleteTransactions, bulkUpdateCategory } from '@/services/transaction-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Transaction, TransactionFilters } from '@/types'

export function Transactions() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()
  const queryClient = useQueryClient()
  const monthRange = getCurrentMonthRange()

  // Filter state
  const [filters, setFilters] = useState<TransactionFilters>({
    start_date: monthRange.start,
    end_date: monthRange.end,
    categories: [],
    source: '',
    type: 'all',
  })
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  // Sorting state
  type SortField = 'date' | 'description' | 'category' | 'source' | 'amount'
  type SortDirection = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Show count state for display limit
  type ShowCount = 50 | 100 | 'all'
  const [showCount, setShowCount] = useState<ShowCount>(50)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined }))
  }, [debouncedSearch])

  // Modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkRecategorizeOpen, setIsBulkRecategorizeOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
  })

  // Clear selection when transactions change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [transactions])

  // Category options for filters
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

  // Selection handlers
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

  // Mutations
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
  }

  const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
  const net = income - expense

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    if (!transactions) return []
    return [...transactions].sort((a, b) => {
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
  }, [transactions, sortField, sortDirection])

  // Apply display limit
  const displayedTransactions = useMemo(() => {
    if (showCount === 'all') return sortedTransactions
    return sortedTransactions.slice(0, showCount)
  }, [sortedTransactions, showCount])

  // Group transactions by date for mobile view
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('transactions.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('transactions.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        {/* Search */}
        <div className="mb-4">
          <Input
            label={t('transactions.search', 'Search')}
            placeholder={t('transactions.searchPlaceholder', 'Search by description...')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Date Range */}
        <div className="mb-4">
          <DateRangePicker
            startDate={filters.start_date || ''}
            endDate={filters.end_date || ''}
            onRangeChange={(start, end) => setFilters({ ...filters, start_date: start, end_date: end })}
          />
        </div>

        {/* Category & Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelect
            label={t('transactions.category', 'Category')}
            options={categoryOptions}
            selected={filters.categories || []}
            onChange={(categories) => setFilters({ ...filters, categories })}
            placeholder={t('transactions.allCategories', 'All categories')}
          />
          <Select
            label={t('transactions.source', 'Source')}
            value={filters.source || ''}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            options={[
              { value: '', label: t('transactions.all', 'All') },
              { value: '楽天カード', label: t('transactions.sourceRakuten', 'Rakuten Card') },
            ]}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          <Button variant="outline" onClick={handleReset}>
            {t('button.reset', 'Reset')}
          </Button>
          <Button
            variant="outline"
            onClick={() => transactions && exportTransactionsCsv(transactions, filters.start_date, filters.end_date)}
            disabled={!transactions || transactions.length === 0}
          >
            {t('transactions.export', 'Export')}
          </Button>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.income')}</p>
          <p className="text-2xl font-bold font-numbers text-green-600 dark:text-green-400">
            {formatCurrencyPrivacy(income, currency, rates, false, isPrivacyMode)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.expense')}</p>
          <p className="text-2xl font-bold font-numbers text-red-600 dark:text-red-400">
            {formatCurrencyPrivacy(expense, currency, rates, false, isPrivacyMode)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.difference')}</p>
          <p className="text-2xl font-bold font-numbers text-blue-600 dark:text-blue-400">
            {formatCurrencyPrivacy(net, currency, rates, false, isPrivacyMode)}
          </p>
        </Card>
      </div>

      {/* Show Count Toggle */}
      {!isLoading && transactions && transactions.length > 0 && (
        <div className="flex items-center justify-between mb-4">
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
        <>
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
                    <td className={`px-6 py-4 text-sm font-semibold font-numbers text-right ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrencySignedPrivacy(tx.amount, tx.type, currency, rates, false, isPrivacyMode)}
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
          <div className="md:hidden space-y-6">
            {groupedTransactions.map((group) => (
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
                      onEdit={setEditingTransaction}
                      onDelete={setDeletingTransaction}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
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

      <TransactionFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
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

      {/* FAB Buttons */}
      <QuickEntryFAB />
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-20 right-20 md:bottom-6 md:right-20 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        aria-label={t('transaction.addTransaction', 'Add Transaction')}
        title={t('quickEntry.fullForm', 'Full Form')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </button>
    </div>
  )
}
