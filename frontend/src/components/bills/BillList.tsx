import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { List, Grid, Filter, SortAsc, SortDesc } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { BillCard } from './BillCard'
import { cn } from '@/utils/cn'
import type { Bill } from '@/types'
import { isPast, isToday } from 'date-fns'

interface BillListProps {
  bills: Bill[]
  isLoading?: boolean
  onBillClick?: (bill: Bill) => void
  onBillEdit?: (bill: Bill) => void
  onBillDelete?: (bill: Bill) => void
  onMarkPaid?: (bill: Bill) => void
  onCreateBill?: () => void
  className?: string
}

type SortOption = 'due_date' | 'amount' | 'name' | 'created_at'
type FilterOption = 'all' | 'unpaid' | 'paid' | 'overdue' | 'upcoming'

export function BillList({
  bills,
  isLoading,
  onBillClick,
  onBillEdit,
  onBillDelete,
  onMarkPaid,
  onCreateBill,
  className
}: BillListProps) {
  const { t } = useTranslation('common')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'due_date', label: t('bills.sort.due_date') },
    { value: 'amount', label: t('bills.sort.amount') },
    { value: 'name', label: t('bills.sort.name') },
    { value: 'created_at', label: t('bills.sort.created_at') }
  ]

  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: 'all', label: t('bills.filter.all') },
    { value: 'unpaid', label: t('bills.filter.unpaid') },
    { value: 'paid', label: t('bills.filter.paid') },
    { value: 'overdue', label: t('bills.filter.overdue') },
    { value: 'upcoming', label: t('bills.filter.upcoming') }
  ]

  const filteredAndSortedBills = bills
    .filter(bill => {
      if (filterBy === 'all') return true
      if (filterBy === 'paid') return bill.is_paid
      if (filterBy === 'unpaid') return !bill.is_paid
      if (filterBy === 'overdue') {
        const dueDate = new Date(bill.next_due_date)
        return !bill.is_paid && isPast(dueDate) && !isToday(dueDate)
      }
      if (filterBy === 'upcoming') {
        const dueDate = new Date(bill.next_due_date)
        return !bill.is_paid && !isPast(dueDate)
      }
      return true
    })
    .filter(bill =>
      bill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'due_date':
          comparison = new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
          break
        case 'amount':
          comparison = Number(a.amount) - Number(b.amount)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const handleMarkPaid = async (bill: Bill) => {
    onMarkPaid?.(bill)
  }

  const handleDelete = (bill: Bill) => {
    if (confirm(t('bills.delete_confirm', { name: bill.name }))) {
      onBillDelete?.(bill)
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder={t('bills.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9"
            />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <Select
            options={filterOptions}
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="w-36"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            options={sortOptions}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-40"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSortOrder}
            className="h-10 w-10"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
          </Button>

          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              className={cn(
                'p-2 transition-colors',
                view === 'list'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              className={cn(
                'p-2 transition-colors',
                view === 'grid'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              onClick={() => setView('grid')}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {onCreateBill && (
            <Button onClick={onCreateBill}>
              {t('bills.add_bill')}
            </Button>
          )}
        </div>
      </div>

      <div className={cn(
        view === 'list' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
      )}>
        {filteredAndSortedBills.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
            <p>{t('bills.no_bills_found')}</p>
          </div>
        ) : (
          filteredAndSortedBills.map(bill => (
            <BillCard
              key={bill.id}
              bill={bill}
              onClick={onBillClick}
              onMarkPaid={handleMarkPaid}
              onEdit={onBillEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {filteredAndSortedBills.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('billsshowing_count', { count: filteredAndSortedBills.length, total: bills.length })}
        </div>
      )}
    </div>
  )
}
