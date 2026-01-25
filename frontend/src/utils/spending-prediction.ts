import type { BudgetAllocation, BudgetTracking, BudgetTrackingItem } from '@/types'

export interface SpendingPrediction {
  category: string
  predictedTotal: number
  budgetAmount: number
  exceededBy: number
  confidence: 'high' | 'medium' | 'low'
  status: 'safe' | 'warning' | 'danger'
  dailyPace: number
  safeDailyPace: number
  anomalyDetected: boolean
  anomalyDescription?: string
  daysRemaining: number
  daysElapsed: number
}

export interface DailySpending {
  date: string
  amount: number
  transaction_count: number
}

export interface MonthlyTotal {
  month: string
  total: number
  avg_daily: number
  transaction_count: number
}

export interface CategoryHistory {
  category: string
  daily_spending: DailySpending[]
  monthly_totals: MonthlyTotal[]
  overall_avg_daily: number
  std_deviation: number
}

/**
 * Calculate mean of an array of numbers
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * Calculate standard deviation of an array of numbers
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2))
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length)
}

/**
 * Detect spending anomaly using 2-sigma rule
 */
export function detectSpendingAnomaly(
  dailyAmounts: number[],
  currentAmount: number
): { isAnomaly: boolean; description: string } {
  if (dailyAmounts.length < 5) {
    return { isAnomaly: false, description: '' }
  }

  const avg = mean(dailyAmounts)
  const std = standardDeviation(dailyAmounts)
  const threshold = avg + (2 * std)

  if (currentAmount > threshold && currentAmount > avg * 1.5) {
    const multiplier = (currentAmount / avg).toFixed(1)
    return {
      isAnomaly: true,
      description: `${multiplier}x higher than daily average`
    }
  }

  return { isAnomaly: false, description: '' }
}

/**
 * Predict category spending based on current pace
 */
export function predictCategorySpending(
  trackingItem: BudgetTrackingItem,
  daysRemaining: number,
  daysElapsed: number,
  historicalData?: { date: string; amount: number }[]
): SpendingPrediction {
  const { category, budgeted, spent } = trackingItem

  // Calculate daily spending pace
  const effectiveDaysElapsed = Math.max(1, daysElapsed)
  const dailyPace = spent / effectiveDaysElapsed

  // Calculate safe daily pace (to stay within budget)
  const remaining = budgeted - spent
  const safeDailyPace = daysRemaining > 0 ? remaining / daysRemaining : 0

  // Project month-end total
  const predictedTotal = spent + (dailyPace * daysRemaining)
  const exceededBy = Math.max(0, predictedTotal - budgeted)

  // Determine confidence based on days elapsed
  let confidence: 'high' | 'medium' | 'low'
  if (daysElapsed >= 15) {
    confidence = 'high'
  } else if (daysElapsed >= 7) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  // Determine status
  const projectedPercent = budgeted > 0 ? (predictedTotal / budgeted) * 100 : 0
  let status: 'safe' | 'warning' | 'danger'
  if (projectedPercent > 100) {
    status = 'danger'
  } else if (projectedPercent > 85) {
    status = 'warning'
  } else {
    status = 'safe'
  }

  // Check for anomalies in historical data
  let anomalyDetected = false
  let anomalyDescription: string | undefined

  if (historicalData && historicalData.length > 0) {
    const dailyAmounts = historicalData.map(d => d.amount)
    const todayAmount = dailyAmounts[dailyAmounts.length - 1] || 0
    const { isAnomaly, description } = detectSpendingAnomaly(
      dailyAmounts.slice(0, -1), // Exclude today for comparison
      todayAmount
    )
    anomalyDetected = isAnomaly
    anomalyDescription = description
  }

  return {
    category,
    predictedTotal,
    budgetAmount: budgeted,
    exceededBy,
    confidence,
    status,
    dailyPace,
    safeDailyPace,
    anomalyDetected,
    anomalyDescription,
    daysRemaining,
    daysElapsed
  }
}

/**
 * Generate predictions for all categories
 */
export function generatePredictions(
  allocations: BudgetAllocation[],
  tracking: BudgetTracking,
  historicalData?: CategoryHistory[]
): SpendingPrediction[] {
  const { days_remaining } = tracking

  // Calculate days elapsed (assuming 30-day month)
  const totalDays = 30
  const daysElapsed = totalDays - days_remaining

  return tracking.categories
    .map(trackingItem => {
      const history = historicalData?.find(h => h.category === trackingItem.category)
      // Convert to legacy format for predictCategorySpending
      const dailySpending = history?.daily_spending.map(d => ({
        date: d.date,
        amount: d.amount
      }))
      return predictCategorySpending(
        trackingItem,
        days_remaining,
        daysElapsed,
        dailySpending
      )
    })
    .filter(p => p.status !== 'safe' || p.anomalyDetected) // Only return concerning predictions
    .sort((a, b) => {
      // Sort by severity: danger > warning > safe, then by exceeded amount
      const statusOrder = { danger: 0, warning: 1, safe: 2 }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return b.exceededBy - a.exceededBy
    })
}

/**
 * Get top N most concerning predictions
 */
export function getTopPredictions(
  predictions: SpendingPrediction[],
  maxCount: number = 3
): SpendingPrediction[] {
  return predictions.slice(0, maxCount)
}

/**
 * Calculate overall budget forecast summary
 */
export function calculateBudgetForecast(
  tracking: BudgetTracking
): {
  totalPredicted: number
  totalBudget: number
  overallStatus: 'safe' | 'warning' | 'danger'
  overallPercent: number
} {
  const totalSpent = tracking.total_spent
  const totalBudget = tracking.total_budgeted
  const daysRemaining = tracking.days_remaining

  // Assume 30-day month for calculation
  const totalDays = 30
  const daysElapsed = Math.max(1, totalDays - daysRemaining)

  const dailyRate = totalSpent / daysElapsed
  const totalPredicted = totalSpent + (dailyRate * daysRemaining)
  const overallPercent = totalBudget > 0 ? (totalPredicted / totalBudget) * 100 : 0

  let overallStatus: 'safe' | 'warning' | 'danger'
  if (overallPercent > 100) {
    overallStatus = 'danger'
  } else if (overallPercent > 85) {
    overallStatus = 'warning'
  } else {
    overallStatus = 'safe'
  }

  return {
    totalPredicted,
    totalBudget,
    overallStatus,
    overallPercent
  }
}
