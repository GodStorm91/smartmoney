import { describe, it, expect } from 'vitest'
import { getBudgetStatus } from './status-badge'

describe('getBudgetStatus', () => {
  describe('returns correct status based on percentage', () => {
    it('returns "on_track" when percentage is less than 80%', () => {
      expect(getBudgetStatus(0)).toBe('on_track')
      expect(getBudgetStatus(50)).toBe('on_track')
      expect(getBudgetStatus(79)).toBe('on_track')
      expect(getBudgetStatus(79.9)).toBe('on_track')
    })

    it('returns "warning" when percentage is between 80% and 95%', () => {
      expect(getBudgetStatus(80)).toBe('warning')
      expect(getBudgetStatus(85)).toBe('warning')
      expect(getBudgetStatus(90)).toBe('warning')
      expect(getBudgetStatus(94)).toBe('warning')
      expect(getBudgetStatus(94.9)).toBe('warning')
    })

    it('returns "exceeded" when percentage is 95% or more', () => {
      expect(getBudgetStatus(95)).toBe('exceeded')
      expect(getBudgetStatus(100)).toBe('exceeded')
      expect(getBudgetStatus(120)).toBe('exceeded')
      expect(getBudgetStatus(200)).toBe('exceeded')
    })
  })

  describe('edge cases', () => {
    it('handles negative percentages as on_track', () => {
      expect(getBudgetStatus(-10)).toBe('on_track')
    })

    it('handles decimal percentages correctly', () => {
      expect(getBudgetStatus(79.99)).toBe('on_track')
      expect(getBudgetStatus(80.01)).toBe('warning')
      expect(getBudgetStatus(94.99)).toBe('warning')
      expect(getBudgetStatus(95.01)).toBe('exceeded')
    })
  })
})
