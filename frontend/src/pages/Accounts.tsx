import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, ChevronDown, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAccounts } from '@/hooks/useAccounts'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountFormModal } from '@/components/accounts/AccountFormModal'
import { CryptoWalletSection } from '@/components/accounts/CryptoWalletSection'
import { LPPositionsSection } from '@/components/accounts/LPPositionsSection'
import { ClosedPositionsSection } from '@/components/crypto/ClosedPositionsSection'
import { TransferFormModal } from '@/components/transfers'
import { TransactionFormModal } from '@/components/transactions/TransactionFormModal'
import { ReceiptScannerModal } from '@/components/receipts/ReceiptScannerModal'
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
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false)
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)
  const [transactionAccountId, setTransactionAccountId] = useState<number | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<AccountType>>(() => loadCollapsedSections())

  // Persist collapsed state to localStorage
  useEffect(() => {
    saveCollapsedSections(collapsedSections)
  }, [collapsedSections])

  // Event listeners for QuickEntryFAB actions
  useEffect(() => {
    const handleOpenAddTransaction = () => {
      setIsAddTransactionModalOpen(true)
    }
    const handleOpenReceiptScanner = () => {
      setIsReceiptScannerOpen(true)
    }
    window.addEventListener('open-add-transaction-modal', handleOpenAddTransaction)
    window.addEventListener('open-receipt-scanner', handleOpenReceiptScanner)
    return () => {
      window.removeEventListener('open-add-transaction-modal', handleOpenAddTransaction)
      window.removeEventListener('open-receipt-scanner', handleOpenReceiptScanner)
    }
  }, [])

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

  const accountTypeOrder: AccountType[] = ['bank', 'savings', 'cash', 'credit_card', 'investment', 'crypto', 'receivable', 'other']

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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">
            {t('account.errors.loadFailed')}: {(error as Error).message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!accounts || accounts.length === 0) && (
        <EmptyState
          icon={<Wallet />}
          title={t('emptyState.accounts.title', 'No accounts added yet')}
          description={t('emptyState.accounts.description', 'Add your bank accounts, credit cards, or cash to track balances')}
          action={
            <button
              onClick={handleCreateAccount}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {t('emptyState.accounts.cta', 'Add Account')}
            </button>
          }
        />
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
                  {typeAccounts.map((account, idx) => (
                    <div
                      key={account.id}
                      className="animate-stagger-in"
                      style={{ '--stagger-index': Math.min(idx, 9) } as React.CSSProperties}
                    >
                      <AccountCard
                        account={account}
                        onEdit={handleEditAccount}
                        onAddTransaction={(id) => {
                          setTransactionAccountId(id)
                          setIsAddTransactionModalOpen(true)
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Crypto Wallets Section */}
          <CryptoWalletSection />

          {/* DeFi/LP Positions Section */}
          <LPPositionsSection />

          {/* Closed Positions Section */}
          <ClosedPositionsSection />
        </div>
      )}

      {/* Crypto Wallets (shown even when no traditional accounts) */}
      {!isLoading && !error && (!accounts || accounts.length === 0) && (
        <div className="mt-8 space-y-6">
          <CryptoWalletSection />
          <LPPositionsSection />
          <ClosedPositionsSection />
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

      {/* Transaction Form Modal */}
      <TransactionFormModal
        isOpen={isAddTransactionModalOpen}
        onClose={() => {
          setIsAddTransactionModalOpen(false)
          setTransactionAccountId(null)
        }}
        defaultAccountId={transactionAccountId}
      />

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onScanComplete={() => setIsReceiptScannerOpen(false)}
      />
    </div>
  )
}
