import { useXPToast } from '@/components/gamification/XPToast'

// XP amounts for different actions
export const XP_VALUES = {
  transaction_created: 5,
  transaction_categorized: 3,
  budget_created: 25,
  budget_met: 50,
  goal_created: 30,
  goal_milestone: 100,
  receipt_uploaded: 15,
  weekly_review: 25,
  daily_login: 10,
  first_transaction: 20,
  first_budget: 50,
  first_goal: 50,
  achievement_unlocked: 50,
} as const

// Helper to show XP gain toast
export function useXPGain() {
  const { addXPGain } = useXPToast()

  const showXPGain = (amount: number, source: string) => {
    addXPGain(amount, source)
  }

  const showTransactionXP = () => {
    addXPGain(XP_VALUES.transaction_created, 'Transaction recorded')
  }

  const showBudgetCreatedXP = () => {
    addXPGain(XP_VALUES.budget_created, 'Budget created')
  }

  const showBudgetMetXP = () => {
    addXPGain(XP_VALUES.budget_met, 'Budget target met')
  }

  const showGoalCreatedXP = () => {
    addXPGain(XP_VALUES.goal_created, 'Goal created')
  }

  const showGoalMilestoneXP = () => {
    addXPGain(XP_VALUES.goal_milestone, 'Goal milestone reached')
  }

  const showReceiptUploadedXP = () => {
    addXPGain(XP_VALUES.receipt_uploaded, 'Receipt uploaded')
  }

  const showDailyLoginXP = () => {
    addXPGain(XP_VALUES.daily_login, 'Daily check-in')
  }

  const showAchievementXP = (achievementName: string, xpReward: number) => {
    addXPGain(xpReward, `Achievement: ${achievementName}`)
  }

  return {
    showXPGain,
    showTransactionXP,
    showBudgetCreatedXP,
    showBudgetMetXP,
    showGoalCreatedXP,
    showGoalMilestoneXP,
    showReceiptUploadedXP,
    showDailyLoginXP,
    showAchievementXP,
    XP_VALUES,
  }
}

export default useXPGain
