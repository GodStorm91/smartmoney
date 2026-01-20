/**
 * Bills Page
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, LayoutGrid, List as ListIcon } from 'lucide-react'
import { BillList } from '@/components/bills/BillList'
import { BillCalendar } from '@/components/bills/BillCalendar'
import { BillForm } from '@/components/bills/BillForm'
import { BillDetailModal } from '@/components/bills/BillDetailModal'
import { useBills } from '@/hooks/useBills'
import { billService } from '@/services/bill-service'
import { AlertBanner } from '@/components/alerts/AlertBanner'
import { cn } from '@/utils/cn'
import type { Bill } from '@/types'

type TabType = 'list' | 'calendar'

export default function Bills() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('list')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [detailBill, setDetailBill] = useState<Bill | null>(null)

  const { bills, isLoading } = useBills()

  const handleBillClick = (bill: Bill) => {
    setDetailBill(bill)
  }

  const handleBillEdit = (bill: Bill) => {
    setSelectedBill(bill)
    setIsFormOpen(true)
  }

  const handleBillDelete = async (bill: Bill) => {
    try {
      await billService.deleteBill(bill.id)
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    } catch (error) {
      console.error('Failed to delete bill:', error)
    }
  }

  const handleMarkPaid = async (bill: Bill) => {
    try {
      await billService.markBillPaid(bill.id)
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    } catch (error) {
      console.error('Failed to mark bill as paid:', error)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['bills'] })
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedBill(null)
  }

  const tabs: { id: TabType; label: string; icon: typeof ListIcon }[] = [
    { id: 'list', label: t('bills.tabs.list'), icon: ListIcon },
    { id: 'calendar', label: t('bills.tabs.calendar'), icon: LayoutGrid }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AlertBanner />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bills.pageTitle', 'Bills & Reminders')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('bills.pageSubtitle', 'Track and manage your recurring bills')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('bills.add_bill')}
        </button>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'list' ? (
        <BillList
          bills={bills}
          isLoading={isLoading}
          onBillClick={handleBillClick}
          onBillEdit={handleBillEdit}
          onBillDelete={handleBillDelete}
          onMarkPaid={handleMarkPaid}
          onCreateBill={() => setIsFormOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BillCalendar
              className="h-full"
            />
          </div>
          <div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('bills.quick_stats')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('bills.total_bills')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {bills.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('bills.paid')}
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {bills.filter((b: Bill) => b.is_paid).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('bills.unpaid')}
                  </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {bills.filter((b: Bill) => !b.is_paid).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BillForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        bill={selectedBill}
        onSuccess={handleFormSuccess}
      />

      <BillDetailModal
        isOpen={!!detailBill}
        onClose={() => setDetailBill(null)}
        bill={detailBill}
        onEdit={handleBillEdit}
        onDelete={handleBillDelete}
        onMarkPaid={handleMarkPaid}
      />
    </div>
  )
}
