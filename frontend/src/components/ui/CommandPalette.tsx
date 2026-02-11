import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Command } from 'cmdk'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Home,
  CreditCard,
  BarChart3,
  Target,
  Upload,
  Settings,
  PlusCircle,
  Search,
  Wallet,
  RefreshCcw,
  Receipt,
  FileText,
  HelpCircle,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { fetchTransactions } from '@/services/transaction-service'
import type { Transaction } from '@/types'
import { formatCurrencySigned } from '@/utils/formatCurrency'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewTransaction?: () => void
  onUpload?: () => void
  onShowShortcuts?: () => void
}

export function CommandPalette({
  open,
  onOpenChange,
  onNewTransaction,
  onUpload,
  onShowShortcuts,
}: CommandPaletteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [search, setSearch] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  // Format transaction amount (already in native currency)
  const formatTxAmount = (amount: number, txCurrency: string) =>
    formatCurrencySigned(amount, undefined, txCurrency, exchangeRates?.rates || {}, true)

  // Search transactions when query changes
  useEffect(() => {
    if (!open || search.length < 2) {
      setTransactions([])
      return
    }

    const searchTransactions = async () => {
      setLoading(true)
      try {
        const results = await fetchTransactions({ search })
        setTransactions(results.slice(0, 5)) // Limit to 5 results
      } catch (error) {
        console.error('Failed to search transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchTransactions, 300)
    return () => clearTimeout(debounce)
  }, [search, open])

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch('')
      setTransactions([])
    }
  }, [open])

  const handleSelect = useCallback(
    (value: string) => {
      onOpenChange(false)

      // Handle navigation
      if (value.startsWith('/')) {
        const [path, qs] = value.split('?')
        const search = qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined
        navigate({ to: path, search })
        return
      }

      // Handle actions
      switch (value) {
        case 'new-transaction':
          onNewTransaction?.()
          break
        case 'upload':
          onUpload?.()
          navigate({ to: '/upload' })
          break
        case 'toggle-theme':
          toggleTheme()
          break
        case 'shortcuts':
          onShowShortcuts?.()
          break
        case 'transaction':
          // Transaction selected - navigate to transactions page with search
          navigate({ to: '/transactions' })
          break
      }
    },
    [navigate, onOpenChange, onNewTransaction, onUpload, toggleTheme, onShowShortcuts]
  )

  const paletteContent = (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t('commandPalette.label', 'Command Palette')}
      className="fixed inset-0 z-[100001] overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/4 -translate-x-1/2 w-full max-w-lg">
        <Command className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
            <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={t('commandPalette.placeholder', 'Search pages, transactions, actions...')}
              className="w-full py-4 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-gray-500 dark:text-gray-400">
              {loading
                ? t('commandPalette.searching', 'Searching...')
                : t('commandPalette.noResults', 'No results found.')}
            </Command.Empty>

            {/* Transaction Results */}
            {transactions.length > 0 && (
              <Command.Group heading={t('commandPalette.transactions', 'Transactions')}>
                {transactions.map((tx) => (
                  <Command.Item
                    key={tx.id}
                    value={`transaction-${tx.id}`}
                    onSelect={() => handleSelect('transaction')}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 data-[selected=true]:bg-primary-50 dark:data-[selected=true]:bg-primary-900/30"
                  >
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{tx.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.date} · {tx.category}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        tx.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isPrivacyMode
                        ? (tx.type === 'income' ? '+¥***' : '-¥***')
                        : formatTxAmount(tx.amount, tx.currency || 'JPY')}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Pages */}
            <Command.Group heading={t('commandPalette.pages', 'Pages')}>
              <CommandItem
                icon={<Home className="w-4 h-4" />}
                label={t('nav.dashboard')}
                shortcut="G D"
                value="/dashboard"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<Receipt className="w-4 h-4" />}
                label={t('nav.transactions')}
                shortcut="G T"
                value="/transactions"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<Wallet className="w-4 h-4" />}
                label={t('nav.accounts')}
                shortcut="G A"
                value="/accounts"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<CreditCard className="w-4 h-4" />}
                label={t('nav.budget')}
                shortcut="G B"
                value="/budget"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<BarChart3 className="w-4 h-4" />}
                label={t('nav.analytics')}
                shortcut="G N"
                value="/analytics"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<FileText className="w-4 h-4" />}
                label={t('report.title')}
                shortcut="G R"
                value="/analytics?tab=report"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<Target className="w-4 h-4" />}
                label={t('nav.goals')}
                shortcut="G G"
                value="/goals"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<RefreshCcw className="w-4 h-4" />}
                label={t('nav.recurring')}
                value="/recurring"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<Settings className="w-4 h-4" />}
                label={t('nav.settings')}
                shortcut="G S"
                value="/settings"
                onSelect={handleSelect}
              />
            </Command.Group>

            {/* Actions */}
            <Command.Group heading={t('commandPalette.actions', 'Actions')}>
              <CommandItem
                icon={<PlusCircle className="w-4 h-4" />}
                label={t('commandPalette.newTransaction', 'New Transaction')}
                shortcut="Ctrl+N"
                value="new-transaction"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<Upload className="w-4 h-4" />}
                label={t('commandPalette.uploadCsv', 'Upload CSV')}
                shortcut="Ctrl+U"
                value="upload"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                label={
                  resolvedTheme === 'dark'
                    ? t('commandPalette.lightMode', 'Switch to Light Mode')
                    : t('commandPalette.darkMode', 'Switch to Dark Mode')
                }
                value="toggle-theme"
                onSelect={handleSelect}
              />
              <CommandItem
                icon={<HelpCircle className="w-4 h-4" />}
                label={t('commandPalette.shortcuts', 'Keyboard Shortcuts')}
                shortcut="?"
                value="shortcuts"
                onSelect={handleSelect}
              />
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
                {t('commandPalette.navigate', 'Navigate')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                {t('commandPalette.select', 'Select')}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
              {t('commandPalette.close', 'Close')}
            </span>
          </div>
        </Command>
      </div>
    </Command.Dialog>
  )

  if (typeof document === 'undefined') return null
  return createPortal(paletteContent, document.body)
}

// Helper component for consistent item styling
interface CommandItemProps {
  icon: React.ReactNode
  label: string
  shortcut?: string
  value: string
  onSelect: (value: string) => void
}

function CommandItem({ icon, label, shortcut, value, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 data-[selected=true]:bg-primary-50 dark:data-[selected=true]:bg-primary-900/30"
    >
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  )
}

export default CommandPalette
