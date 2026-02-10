import { useTheme } from '@/contexts/ThemeContext'

/**
 * Returns item limits based on the current app tier (pro vs lite).
 * Pro: unlimited (large numbers). Lite: reduced counts for a simplified view.
 */
export function useTierLimits() {
  const { tier } = useTheme()
  const isLite = tier === 'lite'

  return {
    tier,
    isLite,
    /** Dashboard recent transactions */
    recentTransactions: isLite ? 3 : 5,
    /** Dashboard category chips */
    categoryChips: isLite ? 4 : 8,
    /** Dashboard goals shown */
    dashboardGoals: isLite ? 1 : 2,
    /** Insight cards on dashboard */
    insightCards: isLite ? 3 : 5,
    /** Savings recommendations */
    savingsRecs: isLite ? 3 : 5,
    /** Anomaly alerts on dashboard */
    anomalyAlerts: isLite ? 2 : 3,
    /** Quick actions shown */
    quickActions: isLite ? 4 : 6,
    /** Category breakdown items in charts */
    categoryBreakdown: isLite ? 5 : 999,
    /** Command palette transaction results */
    searchResults: isLite ? 3 : 5,
  }
}
