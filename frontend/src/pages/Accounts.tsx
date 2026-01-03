import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, ChevronDown } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountFormModal } from '@/components/accounts/AccountFormModal'
import { CryptoWalletSection } from '@/components/accounts/CryptoWalletSection'
import { LPPositionsSection } from '@/components/accounts/LPPositionsSection'
import { TransferFormModal } from '@/components/transfers'
import type { AccountType } from '@/types'

const COLLAPSED_SECTIONS_KEY = 'accounts_collapsed_sections'

// Load collapsed sections from localStorage
function loadCollapsedSections(): Set<AccountType> {
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
    if (stored) {
      return new Set(JSON.parse(stored) as AccountType[])
    }
  } catch {
    // Ignore parse errors
  }
  return new Set()
}

// Save collapsed sections to localStorage
function saveCollapsedSections(collapsed: Set<AccountType>): void {
  localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...collapsed]))
}

export default function Accounts() {
  const { t } = useTranslation('common')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<AccountType>>(() => loadCollapsedSections())

  // Persist collapsed state to localStorage
  useEffect(() => {
    saveCollapsedSections(collapsedSections)
  }, [collapsedSections])

  const toggleSection = useCallback((accountType: AccountType) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(accountType)) {
        next.delete(accountType)
      } else {
        next.add(accountType)
      }
      return next
    })
  }, [])

  const { data: accounts, isLoading, error } = useAccounts(includeInactive)

  const handleCreateAccount = () => {
    setEditingAccountId(null)
    setIsModalOpen(true)
  }

  const handleEditAccount = (accountId: number) => {
    setEditingAccountId(accountId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAccountId(null)
  }

  // Group accounts by type
  const groupedAccounts = accounts?.reduce((groups, account) => {
    const type = account.type
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(account)
    return groups
  }, {} as Record<AccountType, typeof accounts>)

  const accountTypeOrder: AccountType[] = ['bank', 'savings', 'cash', 'credit_card', 'investment', 'receivable', 'other']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('account.accounts')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('account.manageYourAccounts')}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ArrowRightLeft className="w-5 h-5" />
              {t('transfer.title')}
            </button>
            <button
              onClick={handleCreateAccount}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('account.createAccount')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
            {t('account.showInactive')}
          </label>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">
            {t('account.errors.loadFailed')}: {(error as Error).message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!accounts || accounts.length === 0) && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('account.noAccounts')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('account.createFirstAccount')}</p>
          <button
            onClick={handleCreateAccount}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('account.createAccount')}
          </button>
        </div>
      )}

      {/* Accounts list grouped by type */}
      {!isLoading && !error && accounts && accounts.length > 0 && (
        <div className="space-y-8">
          {accountTypeOrder.map((accountType) => {
            const typeAccounts = groupedAccounts?.[accountType]
            if (!typeAccounts || typeAccounts.length === 0) return null

            const isCollapsed = collapsedSections.has(accountType)

            return (
              <div key={accountType}>
                <button
                  type="button"
                  onClick={() => toggleSection(accountType)}
                  className="w-full flex items-center justify-between mb-4 group cursor-pointer"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {t(`account.type.${accountType}`)}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({typeAccounts.length})
                    </span>
                  </h2>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-200 ease-in-out ${
                    isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100'
                  }`}
                >
                  {typeAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onEdit={handleEditAccount}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Crypto Wallets Section */}
          <CryptoWalletSection />

          {/* DeFi/LP Positions Section */}
          <LPPositionsSection />
        </div>
      )}

      {/* Crypto Wallets (shown even when no traditional accounts) */}
      {!isLoading && !error && (!accounts || accounts.length === 0) && (
        <div className="mt-8 space-y-6">
          <CryptoWalletSection />
          <LPPositionsSection />
        </div>
      )}

      {/* Account Form Modal */}
      <AccountFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingAccountId={editingAccountId}
      />

      {/* Transfer Form Modal */}
      <TransferFormModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  )
}
