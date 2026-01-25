import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BudgetTabsContainer } from './budget-tabs-container'

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'budget.tabs.overview': 'Overview',
        'budget.tabs.categories': 'Categories',
        'budget.tabs.transactions': 'Transactions',
        'budget.tabs.forecast': 'Forecast',
        'budget.tabs.navigation': 'Budget navigation',
        'budget.tabs.selectTab': 'Select tab',
      }
      return translations[key] || key
    },
  }),
}))

describe('BudgetTabsContainer', () => {
  const defaultProps = {
    activeTab: 'overview' as const,
    onTabChange: vi.fn(),
    children: <div data-testid="tab-content">Content</div>,
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Desktop Tabs', () => {
    it('renders all 4 tabs', () => {
      render(<BudgetTabsContainer {...defaultProps} />)

      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /categories/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /transactions/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /forecast/i })).toBeInTheDocument()
    })

    it('renders tablist with proper ARIA label', () => {
      render(<BudgetTabsContainer {...defaultProps} />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('aria-label', 'Budget navigation')
    })

    it('marks active tab with aria-selected', () => {
      render(<BudgetTabsContainer {...defaultProps} activeTab="categories" />)

      const categoriesTab = screen.getByRole('tab', { name: /categories/i })
      const overviewTab = screen.getByRole('tab', { name: /overview/i })

      expect(categoriesTab).toHaveAttribute('aria-selected', 'true')
      expect(overviewTab).toHaveAttribute('aria-selected', 'false')
    })

    it('calls onTabChange when tab is clicked', () => {
      const onTabChange = vi.fn()
      render(<BudgetTabsContainer {...defaultProps} onTabChange={onTabChange} />)

      const forecastTab = screen.getByRole('tab', { name: /forecast/i })
      fireEvent.click(forecastTab)

      expect(onTabChange).toHaveBeenCalledWith('forecast')
    })

    it('navigates tabs with ArrowRight key', () => {
      const onTabChange = vi.fn()
      render(<BudgetTabsContainer {...defaultProps} onTabChange={onTabChange} />)

      const overviewTab = screen.getByRole('tab', { name: /overview/i })
      overviewTab.focus()
      fireEvent.keyDown(overviewTab, { key: 'ArrowRight' })

      expect(onTabChange).toHaveBeenCalledWith('categories')
    })

    it('navigates tabs with ArrowLeft key (wraps to end)', () => {
      const onTabChange = vi.fn()
      render(<BudgetTabsContainer {...defaultProps} onTabChange={onTabChange} />)

      const overviewTab = screen.getByRole('tab', { name: /overview/i })
      overviewTab.focus()
      fireEvent.keyDown(overviewTab, { key: 'ArrowLeft' })

      expect(onTabChange).toHaveBeenCalledWith('forecast')
    })

    it('navigates to first tab with Home key', () => {
      const onTabChange = vi.fn()
      render(<BudgetTabsContainer {...defaultProps} activeTab="forecast" onTabChange={onTabChange} />)

      const forecastTab = screen.getByRole('tab', { name: /forecast/i })
      forecastTab.focus()
      fireEvent.keyDown(forecastTab, { key: 'Home' })

      expect(onTabChange).toHaveBeenCalledWith('overview')
    })

    it('navigates to last tab with End key', () => {
      const onTabChange = vi.fn()
      render(<BudgetTabsContainer {...defaultProps} onTabChange={onTabChange} />)

      const overviewTab = screen.getByRole('tab', { name: /overview/i })
      overviewTab.focus()
      fireEvent.keyDown(overviewTab, { key: 'End' })

      expect(onTabChange).toHaveBeenCalledWith('forecast')
    })

    it('sets tabIndex=0 for active tab and -1 for others', () => {
      render(<BudgetTabsContainer {...defaultProps} activeTab="transactions" />)

      const transactionsTab = screen.getByRole('tab', { name: /transactions/i })
      const overviewTab = screen.getByRole('tab', { name: /overview/i })

      expect(transactionsTab).toHaveAttribute('tabindex', '0')
      expect(overviewTab).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Mobile Dropdown', () => {
    it('renders a combobox (select)', () => {
      render(<BudgetTabsContainer {...defaultProps} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })

    it('includes all tab options in dropdown', () => {
      render(<BudgetTabsContainer {...defaultProps} />)

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(4)
      expect(options[0]).toHaveTextContent('Overview')
      expect(options[1]).toHaveTextContent('Categories')
      expect(options[2]).toHaveTextContent('Transactions')
      expect(options[3]).toHaveTextContent('Forecast')
    })

    it('selects correct option based on activeTab', () => {
      render(<BudgetTabsContainer {...defaultProps} activeTab="forecast" />)

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('forecast')
    })

    it('calls onTabChange when dropdown selection changes', () => {
      const onTabChange = vi.fn()
      render(<BudgetTabsContainer {...defaultProps} onTabChange={onTabChange} />)

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'categories' } })

      expect(onTabChange).toHaveBeenCalledWith('categories')
    })
  })

  describe('Tab Panel', () => {
    it('renders children in tab panel', () => {
      render(<BudgetTabsContainer {...defaultProps} />)

      expect(screen.getByTestId('tab-content')).toBeInTheDocument()
    })

    it('sets correct aria attributes on tab panel', () => {
      render(<BudgetTabsContainer {...defaultProps} activeTab="categories" />)

      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveAttribute('id', 'tabpanel-categories')
      expect(panel).toHaveAttribute('aria-labelledby', 'tab-categories')
    })

    it('makes tab panel focusable', () => {
      render(<BudgetTabsContainer {...defaultProps} />)

      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveAttribute('tabindex', '0')
    })
  })
})
