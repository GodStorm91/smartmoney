import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { TransactionEditModal } from '@/components/transactions/TransactionEditModal'
import { TransactionFormModal } from '@/components/transactions/TransactionFormModal'
import { SwipeableTransactionCard } from '@/components/transactions/SwipeableTransactionCard'
import { DeleteConfirmDialog } from '@/components/transactions/DeleteConfirmDialog'
import { formatCurrencyPrivacy, formatCurrencySignedPrivacy } from '@/utils/formatCurrency'
import { formatDate, getCurrentMonthRange } from '@/utils/formatDate'
import { exportTransactionsCsv } from '@/utils/exportCsv'
import { fetchTransactions, deleteTransaction } from '@/services/transaction-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import type { Transaction, TransactionFilters } from '@/types'

export function Transactions() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()
  const queryClient = useQueryClient()
  const monthRange = getCurrentMonthRange()
  const [filters, setFilters] = useState<TransactionFilters>({
    start_date: monthRange.start,
    end_date: monthRange.end,
    category: '',
    source: '',
    type: 'all',
  })
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setDeletingTransaction(null)
    },
  })

  const handleDeleteConfirm = () => {
    if (deletingTransaction) {
      deleteMutation.mutate(deletingTransaction.id)
    }
  }

  const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
  const net = income - expense

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('transactions.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('transactions.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="mb-4">
          <DateRangePicker
            startDate={filters.start_date || ''}
            endDate={filters.end_date || ''}
            onRangeChange={(start, end) => setFilters({ ...filters, start_date: start, end_date: end })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label={t('transactions.category')} value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value })} options={[{ value: '', label: t('transactions.all') }, { value: '食費', label: t('transactions.categoryFood') }, { value: '住宅', label: t('transactions.categoryHousing') }]} />
          <Select label={t('transactions.source')} value={filters.source || ''} onChange={(e) => setFilters({ ...filters, source: e.target.value })} options={[{ value: '', label: t('transactions.all') }, { value: '楽天カード', label: t('transactions.sourceRakuten') }]} />
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" onClick={() => setFilters({ start_date: monthRange.start, end_date: monthRange.end, category: '', source: '', type: 'all' })}>{t('button.reset')}</Button>
          <Button
            variant="outline"
            onClick={() => transactions && exportTransactionsCsv(transactions, filters.start_date, filters.end_date)}
            disabled={!transactions || transactions.length === 0}
          >
            {t('transactions.export')}
          </Button>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.income')}</p><p className="text-2xl font-bold font-numbers text-green-600 dark:text-green-400">{formatCurrencyPrivacy(income, currency, rates, false, isPrivacyMode)}</p></Card>
        <Card><p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.expense')}</p><p className="text-2xl font-bold font-numbers text-red-600 dark:text-red-400">{formatCurrencyPrivacy(expense, currency, rates, false, isPrivacyMode)}</p></Card>
        <Card><p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('transactions.difference')}</p><p className="text-2xl font-bold font-numbers text-blue-600 dark:text-blue-400">{formatCurrencyPrivacy(net, currency, rates, false, isPrivacyMode)}</p></Card>
      </div>

      {/* Transactions Table/List */}
      {isLoading ? (
        <Card><div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div></Card>
      ) : transactions && transactions.length > 0 ? (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.date')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.description')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.category')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.source')}</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('transactions.amount')}</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-24">{t('transactions.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
          <div className="md:hidden space-y-4">
            {transactions.map((tx) => (
              <SwipeableTransactionCard
                key={tx.id}
                transaction={tx}
                onEdit={setEditingTransaction}
                onDelete={setDeletingTransaction}
              />
            ))}
          </div>
        </>
      ) : (
        <Card><p className="text-center text-gray-400 dark:text-gray-500 py-12">{t('transactions.noData')}</p></Card>
      )}

      {/* Edit Modal */}
      <TransactionEditModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
      />

      {/* Add Transaction Modal */}
      <TransactionFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDeleteConfirm}
        transaction={deletingTransaction}
        isDeleting={deleteMutation.isPending}
      />

      {/* FAB - Add Transaction */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        aria-label={t('transaction.addTransaction', 'Add Transaction')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  )
}
