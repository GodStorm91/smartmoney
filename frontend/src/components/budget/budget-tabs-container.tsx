import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, List, Receipt, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { BudgetTab } from '@/hooks/useBudgetTabState'

interface BudgetTabsContainerProps {
  activeTab: BudgetTab
  onTabChange: (tab: BudgetTab) => void
  children: React.ReactNode
  className?: string
  alertTabs?: BudgetTab[]
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
  className,
  alertTabs = [],
}: BudgetTabsContainerProps) {
  const { t } = useTranslation('common')
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll active pill into view on mobile
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = activeRef.current
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
      container.scrollTo({ left, behavior: 'smooth' })
    }
  }, [activeTab])

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
    if (newIndex !== currentIndex) onTabChange(TABS[newIndex].id)
  }

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
          const hasAlert = alertTabs.includes(tab.id)
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
                'relative flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
                isActive
                  ? 'bg-white dark:bg-gray-900 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{t(tab.labelKey)}</span>
              {hasAlert && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Mobile Pill Tabs — horizontal scroll */}
      <div
        ref={scrollRef}
        className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4 -mx-1 px-1"
        role="tablist"
        aria-label={t('budget.tabs.navigation')}
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const hasAlert = alertTabs.includes(tab.id)
          return (
            <button
              key={tab.id}
              ref={isActive ? activeRef : undefined}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'relative flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                'min-h-[44px]',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{t(tab.labelKey)}</span>
              {hasAlert && (
                <span className={cn(
                  'absolute top-1 right-1 w-2 h-2 rounded-full',
                  isActive ? 'bg-white' : 'bg-red-500'
                )} />
              )}
            </button>
          )
        })}
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
