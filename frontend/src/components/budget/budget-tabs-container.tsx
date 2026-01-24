import { useTranslation } from 'react-i18next'
import { LayoutGrid, List, Receipt, TrendingUp, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { BudgetTab } from '@/hooks/useBudgetTabState'

interface BudgetTabsContainerProps {
  activeTab: BudgetTab
  onTabChange: (tab: BudgetTab) => void
  children: React.ReactNode
  className?: string
}

interface TabConfig {
  id: BudgetTab
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabConfig[] = [
  { id: 'overview', labelKey: 'budget.tabs.overview', icon: LayoutGrid },
  { id: 'categories', labelKey: 'budget.tabs.categories', icon: List },
  { id: 'transactions', labelKey: 'budget.tabs.transactions', icon: Receipt },
  { id: 'forecast', labelKey: 'budget.tabs.forecast', icon: TrendingUp },
]

export function BudgetTabsContainer({
  activeTab,
  onTabChange,
  children,
  className
}: BudgetTabsContainerProps) {
  const { t } = useTranslation('common')

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      newIndex = currentIndex > 0 ? currentIndex - 1 : TABS.length - 1
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      newIndex = currentIndex < TABS.length - 1 ? currentIndex + 1 : 0
    } else if (e.key === 'Home') {
      e.preventDefault()
      newIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      newIndex = TABS.length - 1
    }

    if (newIndex !== currentIndex) {
      onTabChange(TABS[newIndex].id)
    }
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab)
  const ActiveIcon = activeTabConfig?.icon || LayoutGrid

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Desktop Tabs */}
      <div
        className="hidden md:flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4"
        role="tablist"
        aria-label={t('budget.tabs.navigation')}
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
                isActive
                  ? 'bg-white dark:bg-gray-900 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>

      {/* Mobile Dropdown */}
      <div className="md:hidden mb-4">
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as BudgetTab)}
            className={cn(
              'w-full appearance-none pl-10 pr-10 py-3 rounded-lg',
              'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
              'border border-gray-200 dark:border-gray-700',
              'font-medium text-sm',
              'focus:outline-none focus:ring-2 focus:ring-green-500'
            )}
            aria-label={t('budget.tabs.selectTab')}
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {t(tab.labelKey)}
              </option>
            ))}
          </select>
          <ActiveIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Tab Content */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  )
}
