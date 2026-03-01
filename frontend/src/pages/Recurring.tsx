/**
 * Recurring Transactions Page
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RecurringTransactionsList } from '@/components/recurring/RecurringTransactionsList'
import { RecurringFormModal } from '@/components/recurring/RecurringFormModal'
import { RecurringSuggestionsCard } from '@/components/recurring/RecurringSuggestionsCard'
import { SubscriptionSummary } from '@/components/recurring/SubscriptionSummary'
import { SubscriptionSuggestions } from '@/components/recurring/SubscriptionSuggestions'
import { cn } from '@/utils/cn'
import type { RecurringSuggestion } from '@/services/recurring-service'

type TabKey = 'all' | 'subscriptions'

function getInitialTab(): TabKey {
  const params = new URLSearchParams(window.location.search)
  return params.get('tab') === 'subscriptions' ? 'subscriptions' : 'all'
}

export default function Recurring() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<RecurringSuggestion | null>(null)

  const handleCreateFromSuggestion = (suggestion: RecurringSuggestion) => {
    setSelectedSuggestion(suggestion)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedSuggestion(null)
    queryClient.invalidateQueries({ queryKey: ['recurring-suggestions'] })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('recurring.pageTitle', 'Recurring Transactions')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('recurring.pageSubtitle', 'Automate your regular income and expenses')}
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-5 h-5" />
          {t('recurring.add', 'Add Recurring')}
        </Button>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {(['all', 'subscriptions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {tab === 'all'
              ? t('recurring.tabAll', 'All')
              : t('recurring.tabSubscriptions', 'Subscriptions')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'all' ? (
        <>
          <RecurringSuggestionsCard onCreateFromSuggestion={handleCreateFromSuggestion} />
          <RecurringTransactionsList />
        </>
      ) : (
        <div className="space-y-6">
          <SubscriptionSummary />
          <SubscriptionSuggestions onCreateFromSuggestion={handleCreateFromSuggestion} />
        </div>
      )}

      {/* Form Modal */}
      <RecurringFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialSuggestion={selectedSuggestion}
      />
    </div>
  )
}
