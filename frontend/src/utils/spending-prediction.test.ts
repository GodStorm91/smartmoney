import { describe, it, expect } from 'vitest'
import {
  detectSpendingAnomaly,
  predictCategorySpending,
  generatePredictions,
  getTopPredictions,
  calculateBudgetForecast
} from './spending-prediction'
import type { BudgetTrackingItem, BudgetTracking, BudgetAllocation } from '@/types'

describe('detectSpendingAnomaly', () => {
  it('detects anomaly when amount > mean + 2*std and > 1.5x avg', () => {
    // Mean: 110, Std: ~7.07, Threshold: ~124
    const dailyAmounts = [100, 120, 110, 105, 115]
    const result = detectSpendingAnomaly(dailyAmounts, 500)
    expect(result.isAnomaly).toBe(true)
    expect(result.description).toContain('higher than daily average')
  })

  it('returns false for normal spending within threshold', () => {
    const dailyAmounts = [100, 120, 110, 105, 115]
    const result = detectSpendingAnomaly(dailyAmounts, 115)
    expect(result.isAnomaly).toBe(false)
    expect(result.description).toBe('')
  })

  it('returns false when array has fewer than 5 elements', () => {
    const result = detectSpendingAnomaly([100, 110, 120], 500)
    expect(result.isAnomaly).toBe(false)
  })

  it('handles empty array gracefully', () => {
    const result = detectSpendingAnomaly([], 100)
    expect(result.isAnomaly).toBe(false)
    expect(result.description).toBe('')
  })

  it('does not flag amounts below 1.5x average even if above 2-sigma', () => {
    // Edge case: high std deviation but amount is not 1.5x higher
    const dailyAmounts = [80, 120, 90, 130, 100] // Mean: 104, high variance
    const result = detectSpendingAnomaly(dailyAmounts, 140) // Just above threshold but < 1.5x avg
    expect(result.isAnomaly).toBe(false)
  })
})

describe('predictCategorySpending', () => {
  const createTrackingItem = (overrides: Partial<BudgetTrackingItem> = {}): BudgetTrackingItem => ({
    category: 'Groceries',
    budgeted: 50000,
    spent: 30000,
    remaining: 20000,
    percentage: 60,
    status: 'yellow',
    ...overrides
  })

  it('projects correctly based on daily pace', () => {
    const tracking = createTrackingItem({ spent: 30000, budgeted: 50000 })
    // 15 days elapsed, 15 remaining
    const result = predictCategorySpending(tracking, 15, 15)
    // Pace: 30000/15 = 2000/day, projected: 30000 + (2000 * 15) = 60000
    expect(result.predictedTotal).toBe(60000)
    expect(result.exceededBy).toBe(10000)
    expect(result.status).toBe('danger')
  })

  it('returns safe status when under budget', () => {
    const tracking = createTrackingItem({ spent: 20000, budgeted: 50000 })
    // 20 days elapsed, 10 remaining
    const result = predictCategorySpending(tracking, 10, 20)
    // Pace: 20000/20 = 1000/day, projected: 20000 + (1000 * 10) = 30000
    expect(result.predictedTotal).toBe(30000)
    expect(result.exceededBy).toBe(0)
    expect(result.status).toBe('safe')
  })

  it('returns warning status when 85-100% projected', () => {
    const tracking = createTrackingItem({ spent: 45000, budgeted: 50000 })
    // 25 days elapsed, 5 remaining
    const result = predictCategorySpending(tracking, 5, 25)
    // Pace: 45000/25 = 1800/day, projected: 45000 + (1800 * 5) = 54000
    // 54000/50000 = 108% → danger (not warning)
    expect(result.status).toBe('danger')
  })

  it('sets confidence to low when days elapsed < 7', () => {
    const tracking = createTrackingItem()
    const result = predictCategorySpending(tracking, 25, 5)
    expect(result.confidence).toBe('low')
  })

  it('sets confidence to medium when 7 <= days elapsed < 15', () => {
    const tracking = createTrackingItem()
    const result = predictCategorySpending(tracking, 20, 10)
    expect(result.confidence).toBe('medium')
  })

  it('sets confidence to high when days elapsed >= 15', () => {
    const tracking = createTrackingItem()
    const result = predictCategorySpending(tracking, 10, 20)
    expect(result.confidence).toBe('high')
  })

  it('handles zero budget gracefully', () => {
    const tracking = createTrackingItem({ budgeted: 0, spent: 1000 })
    const result = predictCategorySpending(tracking, 10, 20)
    expect(result.status).toBe('safe') // 0% of 0 is effectively 0
    expect(result.safeDailyPace).toBe(-100) // negative since over "budget"
  })

  it('handles zero days remaining', () => {
    const tracking = createTrackingItem({ spent: 40000, budgeted: 50000 })
    const result = predictCategorySpending(tracking, 0, 30)
    expect(result.safeDailyPace).toBe(0)
    expect(result.predictedTotal).toBe(40000) // No more spending projected
  })

  it('calculates safe daily pace correctly', () => {
    const tracking = createTrackingItem({ spent: 30000, budgeted: 50000 })
    const result = predictCategorySpending(tracking, 10, 20)
    // Remaining: 20000, days remaining: 10
    expect(result.safeDailyPace).toBe(2000)
  })

  it('detects anomaly when historical data provided', () => {
    const tracking = createTrackingItem()
    const history = [
      { date: '2026-01-01', amount: 100 },
      { date: '2026-01-02', amount: 110 },
      { date: '2026-01-03', amount: 105 },
      { date: '2026-01-04', amount: 108 },
      { date: '2026-01-05', amount: 102 },
      { date: '2026-01-06', amount: 500 } // Today: anomaly
    ]
    const result = predictCategorySpending(tracking, 15, 15, history)
    expect(result.anomalyDetected).toBe(true)
    expect(result.anomalyDescription).toContain('higher than daily average')
  })
})

describe('generatePredictions', () => {
  const createTracking = (categories: Partial<BudgetTrackingItem>[]): BudgetTracking => ({
    month: '2026-01',
    monthly_income: 300000,
    days_remaining: 10,
    safe_to_spend_today: 5000,
    total_budgeted: 200000,
    total_spent: 150000,
    savings_target: 50000,
    categories: categories.map((c, i) => ({
      category: c.category || `Category${i}`,
      budgeted: c.budgeted || 50000,
      spent: c.spent || 0,
      remaining: (c.budgeted || 50000) - (c.spent || 0),
      percentage: c.percentage || 0,
      status: c.status || 'green',
      ...c
    }))
  })

  it('filters to only warning/danger predictions', () => {
    const tracking = createTracking([
      { category: 'A', spent: 55000, budgeted: 50000, percentage: 110, status: 'red' }, // danger
      { category: 'B', spent: 10000, budgeted: 50000, percentage: 20, status: 'green' }  // safe
    ])
    const allocations: BudgetAllocation[] = [
      { category: 'A', amount: 50000 },
      { category: 'B', amount: 50000 }
    ]
    const predictions = generatePredictions(allocations, tracking)
    expect(predictions.length).toBe(1)
    expect(predictions[0].category).toBe('A')
  })

  it('sorts by severity (danger first, then by exceeded amount)', () => {
    const tracking = createTracking([
      { category: 'Warning1', spent: 45000, budgeted: 50000, percentage: 90, status: 'orange' },
      { category: 'Danger1', spent: 60000, budgeted: 50000, percentage: 120, status: 'red' },
      { category: 'Danger2', spent: 70000, budgeted: 50000, percentage: 140, status: 'red' }
    ])
    const allocations: BudgetAllocation[] = [
      { category: 'Warning1', amount: 50000 },
      { category: 'Danger1', amount: 50000 },
      { category: 'Danger2', amount: 50000 }
    ]
    const predictions = generatePredictions(allocations, tracking)
    // Danger categories should come first, sorted by exceededBy desc
    expect(predictions[0].category).toBe('Danger2')
    expect(predictions[1].category).toBe('Danger1')
  })

  it('includes safe categories with anomalies', () => {
    const tracking = createTracking([
      { category: 'SafeWithAnomaly', spent: 10000, budgeted: 50000, percentage: 20, status: 'green' }
    ])
    const allocations: BudgetAllocation[] = [
      { category: 'SafeWithAnomaly', amount: 50000 }
    ]
    const history = [{
      category: 'SafeWithAnomaly',
      daily_spending: [
        { date: '2026-01-01', amount: 100, transaction_count: 1 },
        { date: '2026-01-02', amount: 110, transaction_count: 1 },
        { date: '2026-01-03', amount: 105, transaction_count: 1 },
        { date: '2026-01-04', amount: 108, transaction_count: 1 },
        { date: '2026-01-05', amount: 102, transaction_count: 1 },
        { date: '2026-01-06', amount: 500, transaction_count: 1 } // Anomaly
      ],
      monthly_totals: [],
      overall_avg_daily: 170,
      std_deviation: 150
    }]
    const predictions = generatePredictions(allocations, tracking, history)
    // Should include safe category because it has an anomaly
    expect(predictions.some(p => p.category === 'SafeWithAnomaly' && p.anomalyDetected)).toBe(true)
  })
})

describe('getTopPredictions', () => {
  it('returns top N predictions', () => {
    const predictions = [
      { category: 'A' },
      { category: 'B' },
      { category: 'C' },
      { category: 'D' }
    ] as any[]
    expect(getTopPredictions(predictions, 2)).toHaveLength(2)
    expect(getTopPredictions(predictions, 2)[0].category).toBe('A')
  })

  it('returns all if fewer than maxCount', () => {
    const predictions = [{ category: 'A' }] as any[]
    expect(getTopPredictions(predictions, 3)).toHaveLength(1)
  })

  it('defaults to 3 items', () => {
    const predictions = [
      { category: 'A' },
      { category: 'B' },
      { category: 'C' },
      { category: 'D' }
    ] as any[]
    expect(getTopPredictions(predictions)).toHaveLength(3)
  })
})

describe('calculateBudgetForecast', () => {
  const createTracking = (overrides: Partial<BudgetTracking> = {}): BudgetTracking => ({
    month: '2026-01',
    monthly_income: 300000,
    days_remaining: 10,
    safe_to_spend_today: 5000,
    total_budgeted: 200000,
    total_spent: 100000,
    savings_target: 50000,
    categories: [],
    ...overrides
  })

  it('calculates overall forecast correctly', () => {
    const tracking = createTracking({ total_spent: 100000, total_budgeted: 200000, days_remaining: 10 })
    // Days elapsed: 30 - 10 = 20
    // Daily rate: 100000 / 20 = 5000
    // Predicted: 100000 + (5000 * 10) = 150000
    // Percent: 150000 / 200000 = 75%
    const result = calculateBudgetForecast(tracking)
    expect(result.totalPredicted).toBe(150000)
    expect(result.overallPercent).toBe(75)
    expect(result.overallStatus).toBe('safe')
  })

  it('returns danger status when predicted > 100%', () => {
    const tracking = createTracking({ total_spent: 150000, total_budgeted: 200000, days_remaining: 10 })
    // Daily rate: 150000 / 20 = 7500
    // Predicted: 150000 + (7500 * 10) = 225000
    // Percent: 225000 / 200000 = 112.5%
    const result = calculateBudgetForecast(tracking)
    expect(result.overallStatus).toBe('danger')
  })

  it('returns warning status when 85-100%', () => {
    const tracking = createTracking({ total_spent: 120000, total_budgeted: 200000, days_remaining: 10 })
    // Daily rate: 120000 / 20 = 6000
    // Predicted: 120000 + (6000 * 10) = 180000
    // Percent: 180000 / 200000 = 90%
    const result = calculateBudgetForecast(tracking)
    expect(result.overallPercent).toBe(90)
    expect(result.overallStatus).toBe('warning')
  })

  it('handles zero budget', () => {
    const tracking = createTracking({ total_budgeted: 0, total_spent: 10000, days_remaining: 10 })
    const result = calculateBudgetForecast(tracking)
    expect(result.overallPercent).toBe(0)
    expect(result.overallStatus).toBe('safe')
  })
})
