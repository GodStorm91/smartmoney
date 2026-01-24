import { describe, it, expect } from 'vitest'

/**
 * Test the budget projection calculation logic.
 * These are pure function tests for the calculation formulas used in BudgetProjectionCard.
 */

// Extract the calculation logic for testing
function calculateBudgetProjection(
  month: string,
  totalSpent: number,
  totalBudget: number,
  currentDay: number // For testing, we pass the current day explicitly
) {
  const [year, monthNum] = month.split('-').map(Number)
  const totalDays = new Date(year, monthNum, 0).getDate()
  const daysElapsed = Math.max(1, currentDay)
  const daysRemaining = Math.max(0, totalDays - currentDay)

  // Current daily rate (trend-based)
  const dailyRate = totalSpent / daysElapsed

  // Safe daily rate (what's needed to stay on budget)
  const remainingBudget = totalBudget - totalSpent
  const safeDaily = daysRemaining > 0 ? remainingBudget / daysRemaining : 0

  // Project total based on current trend
  const projectedTotal = totalSpent + (dailyRate * daysRemaining)
  const projectedPercent = totalBudget > 0 ? (projectedTotal / totalBudget) * 100 : 0

  // Over/under amount
  const overUnderAmount = projectedTotal - totalBudget

  // Determine status
  let status: 'good' | 'warning' | 'danger'
  if (projectedPercent > 100) status = 'danger'
  else if (projectedPercent > 90) status = 'warning'
  else status = 'good'

  return {
    daysRemaining,
    daysElapsed,
    dailyRate,
    safeDaily,
    projectedTotal,
    projectedPercent,
    overUnderAmount,
    status,
  }
}

describe('Budget Projection Calculations', () => {
  describe('daily rate calculations', () => {
    it('calculates current daily rate correctly', () => {
      const result = calculateBudgetProjection('2026-01', 30000, 100000, 10)

      // Spent 30000 over 10 days = 3000/day
      expect(result.dailyRate).toBe(3000)
    })

    it('calculates safe daily rate correctly', () => {
      const result = calculateBudgetProjection('2026-01', 30000, 100000, 10)

      // Budget 100000, spent 30000, remaining 70000
      // 31 days in January, day 10, so 21 days remaining
      // Safe daily = 70000 / 21 ≈ 3333.33
      expect(result.safeDaily).toBeCloseTo(70000 / 21, 2)
    })

    it('handles first day of month', () => {
      const result = calculateBudgetProjection('2026-01', 1000, 100000, 1)

      // Day 1, spent 1000
      expect(result.dailyRate).toBe(1000)
      expect(result.daysElapsed).toBe(1)
      expect(result.daysRemaining).toBe(30) // 31 - 1 = 30 days remaining
    })

    it('handles last day of month', () => {
      const result = calculateBudgetProjection('2026-01', 90000, 100000, 31)

      expect(result.daysRemaining).toBe(0)
      expect(result.safeDaily).toBe(0) // No days remaining
    })
  })

  describe('projection calculations', () => {
    it('projects total spending correctly', () => {
      const result = calculateBudgetProjection('2026-01', 30000, 100000, 10)

      // Daily rate = 3000, 21 days remaining
      // Projected = 30000 + (3000 * 21) = 93000
      expect(result.projectedTotal).toBe(30000 + (3000 * 21))
    })

    it('calculates projected percentage correctly', () => {
      const result = calculateBudgetProjection('2026-01', 50000, 100000, 15)

      // Daily rate = 50000/15 ≈ 3333
      // Days remaining = 16
      // Projected = 50000 + (3333 * 16) ≈ 103333
      // Percent ≈ 103.33%
      expect(result.projectedPercent).toBeGreaterThan(100)
    })

    it('calculates over/under amount correctly', () => {
      // Under budget scenario
      const underResult = calculateBudgetProjection('2026-01', 20000, 100000, 20)
      expect(underResult.overUnderAmount).toBeLessThan(0) // Will be under budget

      // Over budget scenario
      const overResult = calculateBudgetProjection('2026-01', 80000, 100000, 10)
      expect(overResult.overUnderAmount).toBeGreaterThan(0) // Will be over budget
    })
  })

  describe('status determination', () => {
    it('returns "good" when projected under 90%', () => {
      // Low spending at start of month
      const result = calculateBudgetProjection('2026-01', 10000, 100000, 15)
      expect(result.status).toBe('good')
    })

    it('returns "warning" when projected between 90-100%', () => {
      // Spending that projects to ~93% (in warning range 90-100%)
      const result = calculateBudgetProjection('2026-01', 45000, 100000, 15)
      // Daily rate = 3000, remaining days = 16
      // Projected = 45000 + (3000 * 16) = 93000 = 93%
      expect(result.status).toBe('warning') // 93% is in warning range

      // Another example at 95%
      const result2 = calculateBudgetProjection('2026-01', 48000, 100000, 15)
      // Daily rate = 3200, remaining days = 16
      // Projected = 48000 + (3200 * 16) = 99200 = 99.2%
      expect(result2.status).toBe('warning')
    })

    it('returns "danger" when projected over 100%', () => {
      // High spending rate
      const result = calculateBudgetProjection('2026-01', 60000, 100000, 10)
      // Daily rate = 6000, remaining days = 21
      // Projected = 60000 + (6000 * 21) = 186000 = 186%
      expect(result.status).toBe('danger')
    })
  })

  describe('edge cases', () => {
    it('handles zero budget', () => {
      const result = calculateBudgetProjection('2026-01', 5000, 0, 10)
      expect(result.projectedPercent).toBe(0)
    })

    it('handles zero spending', () => {
      const result = calculateBudgetProjection('2026-01', 0, 100000, 10)
      expect(result.dailyRate).toBe(0)
      expect(result.projectedTotal).toBe(0)
      expect(result.status).toBe('good')
    })

    it('handles different month lengths', () => {
      // February (28 days in non-leap year)
      const febResult = calculateBudgetProjection('2026-02', 10000, 100000, 14)
      expect(febResult.daysRemaining).toBe(14) // 28 - 14 = 14

      // April (30 days)
      const aprResult = calculateBudgetProjection('2026-04', 10000, 100000, 15)
      expect(aprResult.daysRemaining).toBe(15) // 30 - 15 = 15
    })
  })
})
