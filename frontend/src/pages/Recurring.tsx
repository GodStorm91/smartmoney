/**
 * Recurring Transactions Page
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw } from 'lucide-react'
import { RecurringTransactionsList } from '@/components/recurring/RecurringTransactionsList'
import { RecurringFormModal } from '@/components/recurring/RecurringFormModal'

export default function Recurring() {
  const { t } = useTranslation('common')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('recurring.pageTitle', 'Recurring Transactions')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('recurring.pageSubtitle', 'Automate your regular income and expenses')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('recurring.add', 'Add Recurring')}
        </button>
      </div>

      {/* List */}
      <RecurringTransactionsList />

      {/* Form Modal */}
      <RecurringFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
