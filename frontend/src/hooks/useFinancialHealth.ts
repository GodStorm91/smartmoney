import { useMemo } from 'react'

interface HealthScoreInput {
  income: number
  expense: number
  budgetCategories?: Array<{ allocated: number; spent: number }>
  goals?: Array<{ progress: number; targetProgress?: number }>
}

interface HealthScoreResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  color: string
  breakdown: {
    savingsRate: { score: number; max: number; value: number }
    budgetAdherence: { score: number; max: number; value: number }
    goalProgress: { score: number; max: number; value: number }
  }
  tips: string[]
}

/**
 * Calculate financial health score based on:
 * - Savings rate (40 points max)
 * - Budget adherence (30 points max)
 * - Goal progress (30 points max)
 */
export function useFinancialHealth(input: HealthScoreInput): HealthScoreResult {
  return useMemo(() => {
    const { income, expense, budgetCategories = [], goals = [] } = input

    // 1. Savings Rate (40 points max)
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0
    let savingsScore = 0
    if (savingsRate >= 20) savingsScore = 40
    else if (savingsRate >= 15) savingsScore = 35
    else if (savingsRate >= 10) savingsScore = 30
    else if (savingsRate >= 5) savingsScore = 20
    else if (savingsRate >= 0) savingsScore = 10
    else savingsScore = 0

    // 2. Budget Adherence (30 points max)
    let budgetScore = 30 // Default if no budget
    let budgetAdherenceRate = 100
    if (budgetCategories.length > 0) {
      const underBudget = budgetCategories.filter(c => c.spent <= c.allocated).length
      budgetAdherenceRate = (underBudget / budgetCategories.length) * 100
      budgetScore = Math.round((budgetAdherenceRate / 100) * 30)
    }

    // 3. Goal Progress (30 points max)
    let goalScore = 30 // Default if no goals
    let avgGoalProgress = 100
    if (goals.length > 0) {
      const totalProgress = goals.reduce((sum, g) => sum + Math.min(g.progress, 100), 0)
      avgGoalProgress = totalProgress / goals.length
      goalScore = Math.round((avgGoalProgress / 100) * 30)
    }

    // Total score
    const score = savingsScore + budgetScore + goalScore

    // Grade
    let grade: HealthScoreResult['grade'] = 'F'
    if (score >= 90) grade = 'A'
    else if (score >= 80) grade = 'B'
    else if (score >= 70) grade = 'C'
    else if (score >= 60) grade = 'D'

    // Color
    const colors: Record<HealthScoreResult['grade'], string> = {
      A: '#22c55e', // green-500
      B: '#84cc16', // lime-500
      C: '#eab308', // yellow-500
      D: '#f97316', // orange-500
      F: '#ef4444', // red-500
    }

    // Tips based on weakest areas
    const tips: string[] = []
    if (savingsRate < 10) {
      tips.push('tip.increaseSavings')
    }
    if (budgetAdherenceRate < 80 && budgetCategories.length > 0) {
      tips.push('tip.stayWithinBudget')
    }
    if (avgGoalProgress < 80 && goals.length > 0) {
      tips.push('tip.focusOnGoals')
    }
    if (savingsRate < 0) {
      tips.push('tip.reduceSpending')
    }
    if (tips.length === 0) {
      tips.push('tip.keepItUp')
    }

    return {
      score,
      grade,
      color: colors[grade],
      breakdown: {
        savingsRate: { score: savingsScore, max: 40, value: Math.round(savingsRate) },
        budgetAdherence: { score: budgetScore, max: 30, value: Math.round(budgetAdherenceRate) },
        goalProgress: { score: goalScore, max: 30, value: Math.round(avgGoalProgress) },
      },
      tips,
    }
  }, [input])
}
