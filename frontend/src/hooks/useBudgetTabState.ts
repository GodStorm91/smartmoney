import { useState, useEffect, useCallback } from 'react'

export type BudgetTab = 'overview' | 'categories' | 'transactions' | 'forecast'

const STORAGE_KEY = 'budget-active-tab'
const VALID_TABS: BudgetTab[] = ['overview', 'categories', 'transactions', 'forecast']

function isValidTab(tab: string | null): tab is BudgetTab {
  return tab !== null && VALID_TABS.includes(tab as BudgetTab)
}

/**
 * Hook to manage budget tab state with URL and localStorage persistence.
 * Priority: URL query param > localStorage > 'overview' default
 */
export function useBudgetTabState(defaultTab: BudgetTab = 'overview') {
  // Initialize from URL or localStorage
  const [activeTab, setActiveTabState] = useState<BudgetTab>(() => {
    // Check URL first
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlTab = urlParams.get('tab')
      if (isValidTab(urlTab)) {
        return urlTab
      }

      // Check localStorage
      const storedTab = localStorage.getItem(STORAGE_KEY)
      if (isValidTab(storedTab)) {
        return storedTab
      }
    }
    return defaultTab
  })

  // Sync to URL and localStorage when tab changes
  const setActiveTab = useCallback((tab: BudgetTab) => {
    setActiveTabState(tab)

    if (typeof window !== 'undefined') {
      // Update URL without reload
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.replaceState({}, '', url.toString())

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, tab)
    }
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const urlTab = urlParams.get('tab')
      if (isValidTab(urlTab)) {
        setActiveTabState(urlTab)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return { activeTab, setActiveTab }
}
