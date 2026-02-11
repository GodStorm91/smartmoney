import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fetchTransactions } from '@/services/transaction-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { Transaction, BudgetAllocation } from '@/types'

interface TransactionsTabProps {
  allocations: BudgetAllocation[]
  month: string
  onEditTransaction?: (transaction: Transaction) => void
}

const PAGE_SIZE = 20

export function TransactionsTab({ allocations, month, onEditTransaction }: TransactionsTabProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
  const fmtShort = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)
  const formatTxCurrency = (amount: number, txCurrency: string) =>
    formatCurrencyPrivacy(amount, txCurrency || currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const categories = useMemo(() => ['all', ...allocations.map(a => a.category)], [allocations])

  // Budget lookup: category → budgeted amount
  const budgetMap = useMemo(() => {
    const map = new Map<string, number>()
    allocations.forEach(a => map.set(a.category, a.amount))
    return map
  }, [allocations])

  // Category spending from transactions
  const categorySpent = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach(tx => {
      const cat = tx.category || ''
      map.set(cat, (map.get(cat) || 0) + Math.abs(tx.amount))
    })
    return map
  }, [transactions])

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      try {
        const [year, monthNum] = month.split('-').map(Number)
        const lastDay = new Date(year, monthNum, 0).getDate()
        const data = await fetchTransactions({
          start_date: `${year}-${String(monthNum).padStart(2, '0')}-01`,
          end_date: `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
          type: 'expense'
        })
        if (mounted) setTransactions(data.filter(tx => !tx.is_transfer))
      } catch { if (mounted) setError('Failed to load') }
      finally { if (mounted) setIsLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [month])

  const filteredTransactions = useMemo(() => {
    let result = [...transactions]
    if (selectedCategory !== 'all') result = result.filter(tx => tx.category === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(tx => tx.description.toLowerCase().includes(q) || tx.category?.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      const cmp = sortBy === 'date' ? new Date(a.date).getTime() - new Date(b.date).getTime() : Math.abs(a.amount) - Math.abs(b.amount)
      return sortOrder === 'desc' ? -cmp : cmp
    })
    return result
  }, [transactions, selectedCategory, searchQuery, sortBy, sortOrder])

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE)
  const paginatedTx = filteredTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => { setCurrentPage(1) }, [selectedCategory, searchQuery, sortBy, sortOrder])

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error) return <Card className="p-6 text-center text-red-500">{error}</Card>

  // Budget context for selected category
  const activeBudget = selectedCategory !== 'all' ? budgetMap.get(selectedCategory) : undefined
  const activeSpent = selectedCategory !== 'all' ? (categorySpent.get(selectedCategory) || 0) : undefined
  const activePercent = activeBudget && activeBudget > 0 ? Math.round((activeSpent! / activeBudget) * 100) : undefined
  const isOverBudget = (cat: string) => {
    const b = budgetMap.get(cat)
    return b !== undefined && b > 0 && (categorySpent.get(cat) || 0) > b
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
          {categories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? t('transactions.allCategories') : cat}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('transactions.search')} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
        </div>
        <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [b, o] = e.target.value.split('-'); setSortBy(b as 'date'|'amount'); setSortOrder(o as 'asc'|'desc') }} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
          <option value="date-desc">{t('transactions.sortDateDesc')}</option>
          <option value="date-asc">{t('transactions.sortDateAsc')}</option>
          <option value="amount-desc">{t('transactions.sortAmountDesc')}</option>
          <option value="amount-asc">{t('transactions.sortAmountAsc')}</option>
        </select>
      </div>

      {/* Category budget progress bar — shown when filtering by category */}
      {activeBudget !== undefined && activeSpent !== undefined && (
        <div className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedCategory}</span>
            <span className={cn('text-sm font-semibold', activePercent! > 100 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white')}>
              {t('budget.budgetContext.progress', { spent: fmtShort(activeSpent), budgeted: fmtShort(activeBudget) })}
              {' '}({activePercent}%)
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={cn(
              'h-full rounded-full transition-all',
              activePercent! > 100 ? 'bg-red-500' : activePercent! > 85 ? 'bg-amber-500' : 'bg-green-500'
            )} style={{ width: `${Math.min(100, activePercent!)}%` }} />
          </div>
        </div>
      )}

      <Card className="divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        {paginatedTx.length === 0 ? <div className="p-8 text-center text-gray-500">{t('transactions.noData')}</div> : paginatedTx.map(tx => {
          const catBudget = budgetMap.get(tx.category || '')
          const impactPercent = catBudget && catBudget > 0 ? Math.round((Math.abs(tx.amount) / catBudget) * 100) : 0
          const overBudgetCat = isOverBudget(tx.category || '')

          return (
            <button key={tx.id} onClick={() => onEditTransaction?.(tx)} className={cn(
              'w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 text-left',
              overBudgetCat && 'border-l-3 border-l-red-400 dark:border-l-red-500'
            )}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                <p className="text-sm text-gray-500">{formatDate(tx.date, 'MMM d')} • {tx.category || t('category.other')}</p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <span className="font-semibold text-gray-900 dark:text-white">{formatTxCurrency(tx.amount, tx.currency)}</span>
                {impactPercent > 10 && (
                  <p className={cn(
                    'text-[10px] font-medium mt-0.5',
                    impactPercent > 30 ? 'text-red-500' : impactPercent > 20 ? 'text-amber-500' : 'text-gray-400'
                  )}>
                    {t('budget.budgetContext.impact', { percent: impactPercent })}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{t('transactions.showingCount', { shown: paginatedTx.length, total: filteredTransactions.length })}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
