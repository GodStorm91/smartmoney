import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatCurrencySigned } from '@/utils/formatCurrency'
import { formatDate, getCurrentMonthRange } from '@/utils/formatDate'
import { fetchTransactions } from '@/services/transaction-service'
import { useSettings } from '@/contexts/SettingsContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import type { TransactionFilters } from '@/types'

export function Transactions() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const rates = useRatesMap()
  const monthRange = getCurrentMonthRange()
  const [filters, setFilters] = useState<TransactionFilters>({
    start_date: monthRange.start,
    end_date: monthRange.end,
    category: '',
    source: '',
    type: 'all',
  })

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
  })

  const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
  const net = income - expense

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('transactions.title')}</h2>
        <p className="text-gray-600">{t('transactions.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input type="date" label={t('transactions.startDate')} value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
          <Input type="date" label={t('transactions.endDate')} value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
          <Select label={t('transactions.category')} value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value })} options={[{ value: '', label: t('transactions.all') }, { value: '食費', label: t('transactions.categoryFood') }, { value: '住宅', label: t('transactions.categoryHousing') }]} />
          <Select label={t('transactions.source')} value={filters.source || ''} onChange={(e) => setFilters({ ...filters, source: e.target.value })} options={[{ value: '', label: t('transactions.all') }, { value: '楽天カード', label: t('transactions.sourceRakuten') }]} />
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => {}}>{t('button.apply')}</Button>
          <Button variant="outline" onClick={() => setFilters({ start_date: monthRange.start, end_date: monthRange.end, category: '', source: '', type: 'all' })}>{t('button.reset')}</Button>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-sm text-gray-600 mb-1">{t('transactions.income')}</p><p className="text-2xl font-bold font-numbers text-green-600">{formatCurrency(income, currency, rates, false)}</p></Card>
        <Card><p className="text-sm text-gray-600 mb-1">{t('transactions.expense')}</p><p className="text-2xl font-bold font-numbers text-red-600">{formatCurrency(expense, currency, rates, false)}</p></Card>
        <Card><p className="text-sm text-gray-600 mb-1">{t('transactions.difference')}</p><p className="text-2xl font-bold font-numbers text-blue-600">{formatCurrency(net, currency, rates, false)}</p></Card>
      </div>

      {/* Transactions Table/List */}
      {isLoading ? (
        <Card><div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div></Card>
      ) : transactions && transactions.length > 0 ? (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">{t('transactions.date')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">{t('transactions.description')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">{t('transactions.category')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">{t('transactions.source')}</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">{t('transactions.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{tx.description}</td>
                    <td className="px-6 py-4"><Badge variant={tx.type === 'income' ? 'info' : 'default'}>{tx.category}</Badge></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.source}</td>
                    <td className={`px-6 py-4 text-sm font-semibold font-numbers text-right ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrencySigned(tx.amount, tx.type, currency, rates, false)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{tx.description}</p>
                    <p className="text-sm text-gray-600">{formatDate(tx.date)}</p>
                  </div>
                  <p className={`text-lg font-bold font-numbers ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencySigned(tx.amount, tx.type, currency, rates, false)}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge>{tx.category}</Badge>
                  <span className="text-gray-600">{tx.source}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card><p className="text-center text-gray-400 py-12">{t('transactions.noData')}</p></Card>
      )}
    </div>
  )
}
