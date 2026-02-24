import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, ChevronDown, Wallet, Search, X, Plus, Eye, EyeOff } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { useAccounts } from '@/hooks/useAccounts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountFormModal } from '@/components/accounts/AccountFormModal'
import { CryptoWalletSection } from '@/components/accounts/CryptoWalletSection'
import { LPPositionsSection } from '@/components/accounts/LPPositionsSection'
import { ClosedPositionsSection } from '@/components/crypto/ClosedPositionsSection'
import { TransferFormModal } from '@/components/transfers'
import { TransactionFormModal } from '@/components/transactions/TransactionFormModal'
import { ReceiptScannerModal } from '@/components/receipts/ReceiptScannerModal'
import { cn } from '@/utils/cn'
import type { AccountType, AccountWithBalance } from '@/types'

const COLLAPSED_SECTIONS_KEY = 'accounts_collapsed_sections'

function loadCollapsedSections(): Set<AccountType> {
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
    if (stored) return new Set(JSON.parse(stored) as AccountType[])
  } catch { /* ignore */ }
  return new Set()
}

function saveCollapsedSections(collapsed: Set<AccountType>): void {
  localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...collapsed]))
}

const ACCOUNT_TYPE_ORDER: AccountType[] = ['bank', 'savings', 'cash', 'credit_card', 'investment', 'crypto', 'receivable', 'other']

export default function Accounts() {
  const { t } = useTranslation('common')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery, 200)
  const [activeTypeFilter, setActiveTypeFilter] = useState<AccountType | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false)
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)
  const [transactionAccountId, setTransactionAccountId] = useState<number | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<AccountType>>(() => loadCollapsedSections())

  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()

  useEffect(() => { saveCollapsedSections(collapsedSections) }, [collapsedSections])

  // Event listeners for QuickEntryFAB
  useEffect(() => {
    const handleOpenAddTransaction = () => setIsAddTransactionModalOpen(true)
    const handleOpenReceiptScanner = () => setIsReceiptScannerOpen(true)
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
      if (next.has(accountType)) next.delete(accountType)
      else next.add(accountType)
      return next
    })
  }, [])

  const { data: accounts, isLoading, error } = useAccounts(includeInactive)

  // Filter accounts by search and type
  const filteredAccounts = useMemo(() => {
    if (!accounts) return []
    let result = accounts
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        t(`account.type.${a.type}`).toLowerCase().includes(q) ||
        (a.notes?.toLowerCase().includes(q))
      )
    }
    if (activeTypeFilter) {
      result = result.filter(a => a.type === activeTypeFilter)
    }
    return result
  }, [accounts, debouncedSearch, activeTypeFilter, t])

  // Group filtered accounts by type
  const groupedAccounts = useMemo(() => {
    return filteredAccounts.reduce((groups, account) => {
      const type = account.type
      if (!groups[type]) groups[type] = []
      groups[type].push(account)
      return groups
    }, {} as Record<AccountType, AccountWithBalance[]>)
  }, [filteredAccounts])

  // Available types (for filter pills)
  const availableTypes = useMemo(() => {
    if (!accounts) return []
    const types = new Set(accounts.map(a => a.type))
    return ACCOUNT_TYPE_ORDER.filter(t => types.has(t))
  }, [accounts])

  // Total balance summary
  const totalBalance = useMemo(() => {
    if (!filteredAccounts.length) return 0
    // Sum all balances (already in minor units)
    return filteredAccounts.reduce((sum, a) => sum + a.current_balance, 0)
  }, [filteredAccounts])

  const handleCreateAccount = () => { setEditingAccountId(null); setIsModalOpen(true) }
  const handleEditAccount = (id: number) => { setEditingAccountId(id); setIsModalOpen(true) }
  const handleCloseModal = () => { setIsModalOpen(false); setEditingAccountId(null) }

  const hasAccounts = accounts && accounts.length > 0
  const hasFilteredResults = filteredAccounts.length > 0
  const isSearching = debouncedSearch.trim() !== '' || activeTypeFilter !== null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('account.accounts')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('account.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('transfer.title')}</span>
            </button>
            <button
              onClick={handleCreateAccount}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('account.createAccount')}
            </button>
          </div>
        </div>
      </div>

      {/* Search + Filters toolbar */}
      {hasAccounts && (
        <div className="mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('account.searchPlaceholder', 'Search accounts...')}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Type filter pills + inactive toggle */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setActiveTypeFilter(null)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                !activeTypeFilter
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {t('account.allTypes', 'All')} ({accounts?.length || 0})
            </button>
            {availableTypes.map(type => {
              const count = accounts?.filter(a => a.type === type).length || 0
              return (
                <button
                  key={type}
                  onClick={() => setActiveTypeFilter(activeTypeFilter === type ? null : type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                    activeTypeFilter === type
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {t(`account.type.${type}`)} ({count})
                </button>
              )
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Inactive toggle */}
            <button
              onClick={() => setIncludeInactive(!includeInactive)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                includeInactive
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {includeInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {t('account.showInactive')}
            </button>
          </div>
        </div>
      )}

      {/* Total Balance Summary */}
      {hasAccounts && hasFilteredResults && (
        <div className="mb-6">
          <Card variant="glass" className="!p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {isSearching ? t('account.filteredBalance', 'Filtered Balance') : t('account.totalBalance', 'Total Balance')}
                </p>
                <p className={cn(
                  'text-2xl sm:text-3xl font-bold font-mono mt-1',
                  totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {formatCurrencyPrivacy(totalBalance, 'JPY', exchangeRates?.rates || {}, true, isPrivacyMode)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredAccounts.length} {t('account.accountCount', 'accounts')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400 text-sm">
            {t('account.errors.loadFailed')}
          </p>
        </div>
      )}

      {/* Empty state - no accounts at all */}
      {!isLoading && !error && !hasAccounts && (
        <EmptyState
          icon={<Wallet />}
          title={t('emptyState.accounts.title')}
          description={t('emptyState.accounts.description')}
          action={
            <button
              onClick={handleCreateAccount}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('emptyState.accounts.cta')}
            </button>
          }
        />
      )}

      {/* Empty search results */}
      {!isLoading && !error && hasAccounts && !hasFilteredResults && isSearching && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('account.noSearchResults', 'No accounts match your search')}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setActiveTypeFilter(null) }}
            className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            {t('account.clearFilters', 'Clear filters')}
          </button>
        </div>
      )}

      {/* Accounts list grouped by type */}
      {!isLoading && !error && hasFilteredResults && (
        <div className="space-y-6">
          {ACCOUNT_TYPE_ORDER.map((accountType) => {
            const typeAccounts = groupedAccounts[accountType]
            if (!typeAccounts || typeAccounts.length === 0) return null

            const isCollapsed = collapsedSections.has(accountType)

            return (
              <div key={accountType}>
                <button
                  type="button"
                  onClick={() => toggleSection(accountType)}
                  className="w-full flex items-center justify-between mb-3 group cursor-pointer"
                >
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {t(`account.type.${accountType}`)}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {typeAccounts.length}
                    </span>
                  </h2>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform duration-200',
                      isCollapsed && '-rotate-90'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-200 ease-in-out',
                    isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100'
                  )}
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

          {/* Crypto sections */}
          <CryptoWalletSection />
          <LPPositionsSection />
          <ClosedPositionsSection />
        </div>
      )}

      {/* Crypto sections when no traditional accounts */}
      {!isLoading && !error && !hasAccounts && (
        <div className="mt-8 space-y-6">
          <CryptoWalletSection />
          <LPPositionsSection />
          <ClosedPositionsSection />
        </div>
      )}

      {/* Modals */}
      <AccountFormModal isOpen={isModalOpen} onClose={handleCloseModal} editingAccountId={editingAccountId} />
      <TransferFormModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />
      <TransactionFormModal
        isOpen={isAddTransactionModalOpen}
        onClose={() => { setIsAddTransactionModalOpen(false); setTransactionAccountId(null) }}
        defaultAccountId={transactionAccountId}
      />
      <ReceiptScannerModal isOpen={isReceiptScannerOpen} onClose={() => setIsReceiptScannerOpen(false)} onScanComplete={() => setIsReceiptScannerOpen(false)} />
    </div>
  )
}
