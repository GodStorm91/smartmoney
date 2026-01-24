import { describe, it, expect } from 'vitest'
import type { BudgetAllocation } from '@/types'

/**
 * Test the donut chart data preparation logic.
 * This tests the algorithm that groups categories into max 5 + "Other".
 */

interface ChartDataItem {
  name: string
  value: number
  percentage: number
}

// Extract the chart data preparation logic for testing
function prepareChartData(
  allocations: BudgetAllocation[],
  totalAllocated: number
): ChartDataItem[] {
  if (!allocations.length) return []

  // Sort by amount descending
  const sorted = [...allocations].sort((a, b) => b.amount - a.amount)

  // Take top 5 categories
  const top5 = sorted.slice(0, 5)
  const others = sorted.slice(5)

  // Calculate "Other" total if needed
  const othersTotal = others.reduce((sum, a) => sum + a.amount, 0)

  const data: ChartDataItem[] = top5.map((a) => ({
    name: a.category,
    value: a.amount,
    percentage: totalAllocated > 0 ? (a.amount / totalAllocated) * 100 : 0,
  }))

  // Add "Other" category if there are more than 5 categories
  if (othersTotal > 0) {
    data.push({
      name: 'Other',
      value: othersTotal,
      percentage: totalAllocated > 0 ? (othersTotal / totalAllocated) * 100 : 0,
    })
  }

  return data
}

describe('Budget Donut Chart Data Preparation', () => {
  const createAllocation = (category: string, amount: number): BudgetAllocation => ({
    category,
    amount,
  })

  describe('basic data preparation', () => {
    it('returns empty array for no allocations', () => {
      const result = prepareChartData([], 0)
      expect(result).toEqual([])
    })

    it('includes all categories when 5 or fewer', () => {
      const allocations = [
        createAllocation('Food', 30000),
        createAllocation('Transport', 20000),
        createAllocation('Entertainment', 10000),
      ]
      const total = 60000

      const result = prepareChartData(allocations, total)

      expect(result).toHaveLength(3)
      expect(result.map(r => r.name)).toEqual(['Food', 'Transport', 'Entertainment'])
    })

    it('calculates percentages correctly', () => {
      const allocations = [
        createAllocation('Food', 50000),
        createAllocation('Transport', 30000),
        createAllocation('Other', 20000),
      ]
      const total = 100000

      const result = prepareChartData(allocations, total)

      expect(result[0].percentage).toBe(50)
      expect(result[1].percentage).toBe(30)
      expect(result[2].percentage).toBe(20)
    })
  })

  describe('category grouping', () => {
    it('groups categories beyond top 5 into "Other"', () => {
      const allocations = [
        createAllocation('Food', 30000),
        createAllocation('Transport', 25000),
        createAllocation('Entertainment', 20000),
        createAllocation('Shopping', 15000),
        createAllocation('Health', 10000),
        createAllocation('Education', 5000),
        createAllocation('Misc', 3000),
      ]
      const total = 108000

      const result = prepareChartData(allocations, total)

      expect(result).toHaveLength(6) // 5 top + 1 "Other"
      expect(result[5].name).toBe('Other')
      expect(result[5].value).toBe(8000) // Education (5000) + Misc (3000)
    })

    it('does not add "Other" when exactly 5 categories', () => {
      const allocations = [
        createAllocation('Food', 30000),
        createAllocation('Transport', 25000),
        createAllocation('Entertainment', 20000),
        createAllocation('Shopping', 15000),
        createAllocation('Health', 10000),
      ]
      const total = 100000

      const result = prepareChartData(allocations, total)

      expect(result).toHaveLength(5)
      expect(result.find(r => r.name === 'Other')).toBeUndefined()
    })
  })

  describe('sorting', () => {
    it('sorts categories by amount descending', () => {
      const allocations = [
        createAllocation('Small', 5000),
        createAllocation('Large', 50000),
        createAllocation('Medium', 20000),
      ]
      const total = 75000

      const result = prepareChartData(allocations, total)

      expect(result[0].name).toBe('Large')
      expect(result[1].name).toBe('Medium')
      expect(result[2].name).toBe('Small')
    })

    it('keeps top 5 highest amounts', () => {
      const allocations = [
        createAllocation('Cat1', 100),
        createAllocation('Cat2', 200),
        createAllocation('Cat3', 300),
        createAllocation('Cat4', 400),
        createAllocation('Cat5', 500),
        createAllocation('Cat6', 600),
        createAllocation('Cat7', 700),
      ]
      const total = 2800

      const result = prepareChartData(allocations, total)

      // Top 5 should be Cat7, Cat6, Cat5, Cat4, Cat3
      expect(result[0].name).toBe('Cat7')
      expect(result[1].name).toBe('Cat6')
      expect(result[2].name).toBe('Cat5')
      expect(result[3].name).toBe('Cat4')
      expect(result[4].name).toBe('Cat3')

      // Other should contain Cat1 + Cat2 = 300
      expect(result[5].name).toBe('Other')
      expect(result[5].value).toBe(300)
    })
  })

  describe('edge cases', () => {
    it('handles zero total allocated', () => {
      const allocations = [
        createAllocation('Food', 0),
        createAllocation('Transport', 0),
      ]

      const result = prepareChartData(allocations, 0)

      expect(result[0].percentage).toBe(0)
      expect(result[1].percentage).toBe(0)
    })

    it('handles single category', () => {
      const allocations = [createAllocation('Food', 50000)]

      const result = prepareChartData(allocations, 50000)

      expect(result).toHaveLength(1)
      expect(result[0].percentage).toBe(100)
    })

    it('handles equal amounts', () => {
      const allocations = [
        createAllocation('A', 10000),
        createAllocation('B', 10000),
        createAllocation('C', 10000),
      ]

      const result = prepareChartData(allocations, 30000)

      expect(result).toHaveLength(3)
      result.forEach(item => {
        expect(item.percentage).toBeCloseTo(33.33, 1)
      })
    })
  })
})
