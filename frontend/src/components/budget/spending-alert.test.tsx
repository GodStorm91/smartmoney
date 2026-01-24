import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpendingAlert } from './spending-alert'
import type { BudgetTrackingItem } from '@/types'

// Mock the hooks and translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'budget.alerts.exceededBy': `${params?.category} exceeded by ${params?.amount}`,
        'budget.alerts.approaching': `${params?.category} at limit — ${params?.amount} left for ${params?.days} days`,
        'budget.alerts.allOnTrack': `${params?.count} categories on track. Keep it up!`,
        'viewDetails': 'View Details',
        'button.close': 'Close',
      }
      return translations[key] || key
    },
  }),
}))

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({ currency: 'JPY' }),
}))

vi.mock('@/contexts/PrivacyContext', () => ({
  usePrivacy: () => ({ isPrivacyMode: false }),
}))

vi.mock('@/hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({ data: { rates: { JPY: 1 } } }),
}))

vi.mock('@/utils/formatCurrency', () => ({
  formatCurrencyPrivacy: (amount: number) => `¥${amount.toLocaleString()}`,
}))

describe('SpendingAlert', () => {
  const createTrackingItem = (
    category: string,
    status: 'red' | 'orange' | 'yellow' | 'green',
    remaining: number,
    percentage: number
  ): BudgetTrackingItem => ({
    category,
    budgeted: 10000,
    spent: 10000 - remaining,
    remaining,
    percentage,
    status,
  })

  describe('alert generation', () => {
    it('shows exceeded alert when category status is red', () => {
      const categories = [
        createTrackingItem('Food', 'red', -2000, 120),
      ]

      render(
        <SpendingAlert categories={categories} daysRemaining={10} />
      )

      expect(screen.getByText(/Food exceeded by/)).toBeInTheDocument()
    })

    it('shows warning alert when category status is orange', () => {
      const categories = [
        createTrackingItem('Transport', 'orange', 1000, 90),
      ]

      render(
        <SpendingAlert categories={categories} daysRemaining={10} />
      )

      expect(screen.getByText(/Transport at limit/)).toBeInTheDocument()
    })

    it('shows on track message when all categories are green/yellow', () => {
      const categories = [
        createTrackingItem('Food', 'green', 5000, 50),
        createTrackingItem('Transport', 'yellow', 3000, 70),
      ]

      render(
        <SpendingAlert categories={categories} daysRemaining={10} />
      )

      expect(screen.getByText(/2 categories on track/)).toBeInTheDocument()
    })

    it('limits exceeded alerts to max 2', () => {
      const categories = [
        createTrackingItem('Food', 'red', -1000, 110),
        createTrackingItem('Transport', 'red', -2000, 120),
        createTrackingItem('Entertainment', 'red', -3000, 130),
      ]

      render(
        <SpendingAlert categories={categories} daysRemaining={10} />
      )

      // Should only show 2 alerts max
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeLessThanOrEqual(2)
    })

    it('renders nothing when no categories', () => {
      const { container } = render(
        <SpendingAlert categories={[]} daysRemaining={10} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('dismiss functionality', () => {
    it('hides alert when dismiss button is clicked', () => {
      const categories = [
        createTrackingItem('Food', 'red', -2000, 120),
      ]

      render(
        <SpendingAlert categories={categories} daysRemaining={10} />
      )

      // Find and click dismiss button
      const dismissButton = screen.getByLabelText('Close')
      fireEvent.click(dismissButton)

      // Alert should be hidden
      expect(screen.queryByText(/Food exceeded/)).not.toBeInTheDocument()
    })
  })

  describe('view category callback', () => {
    it('calls onViewCategory when view button is clicked', () => {
      const onViewCategory = vi.fn()
      const categories = [
        createTrackingItem('Food', 'red', -2000, 120),
      ]

      render(
        <SpendingAlert
          categories={categories}
          daysRemaining={10}
          onViewCategory={onViewCategory}
        />
      )

      // Find and click view button
      const viewButton = screen.getByLabelText('View Details')
      fireEvent.click(viewButton)

      expect(onViewCategory).toHaveBeenCalledWith('Food')
    })
  })
})
