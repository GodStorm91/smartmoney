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

  const categories = useMemo(() => ['all', ...allocations.map(a => a.category)], [allocations])

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
      <Card className="divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        {paginatedTx.length === 0 ? <div className="p-8 text-center text-gray-500">{t('transactions.noData')}</div> : paginatedTx.map(tx => (
          <button key={tx.id} onClick={() => onEditTransaction?.(tx)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
              <p className="text-sm text-gray-500">{formatDate(tx.date, 'MMM d')} • {tx.category || t('category.other')}</p>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white ml-4">{formatCurrency(tx.amount)}</span>
          </button>
        ))}
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
