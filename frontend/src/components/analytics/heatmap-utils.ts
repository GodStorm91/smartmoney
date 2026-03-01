/**
 * Heatmap utility: colour-tier calculation and week-grid construction.
 */
import type { DailySpendingEntry } from '@/types'

// --------------------------------------------------------------------------
// Colour tiers
// --------------------------------------------------------------------------

export type HeatmapTier = 0 | 1 | 2 | 3 | 4 | 5

export function getTier(amount: number, maxAmount: number): HeatmapTier {
  if (amount <= 0 || maxAmount <= 0) return 0
  const ratio = amount / maxAmount
  if (ratio <= 0.1) return 1
  if (ratio <= 0.3) return 2
  if (ratio <= 0.55) return 3
  if (ratio <= 0.8) return 4
  return 5
}

/** Tailwind class for light-mode background at each tier. */
export const TIER_LIGHT: Record<HeatmapTier, string> = {
  0: 'bg-gray-100',
  1: 'bg-expense-50',
  2: 'bg-expense-100',
  3: 'bg-expense-300',
  4: 'bg-expense-600',
  5: 'bg-expense-900',
}

/** Tailwind class for dark-mode background at each tier (opacity variants). */
export const TIER_DARK: Record<HeatmapTier, string> = {
  0: 'dark:bg-gray-700/40',
  1: 'dark:bg-expense-900/20',
  2: 'dark:bg-expense-900/40',
  3: 'dark:bg-expense-600/60',
  4: 'dark:bg-expense-300/70',
  5: 'dark:bg-expense-100/80',
}

export function tierClasses(tier: HeatmapTier): string {
  return `${TIER_LIGHT[tier]} ${TIER_DARK[tier]}`
}

// --------------------------------------------------------------------------
// Week-grid construction
//
// Organises a flat list of daily entries into ISO-week columns (Mon–Sun rows).
// weeks[w].days[0–6] = DailySpendingEntry | undefined
// --------------------------------------------------------------------------

export interface WeekGrid {
  weekLabel: string
  days: (DailySpendingEntry | undefined)[]
}

export function buildWeekGrid(entries: DailySpendingEntry[]): WeekGrid[] {
  if (entries.length === 0) return []

  const byDate = new Map<string, DailySpendingEntry>()
  for (const e of entries) byDate.set(e.date, e)

  // Rewind start to the nearest Monday
  const firstDate = new Date(entries[0].date)
  const lastDate = new Date(entries[entries.length - 1].date)

  const startMonday = new Date(firstDate)
  const dow0 = (firstDate.getDay() + 6) % 7 // Sun=0 → Mon=0 mapping
  startMonday.setDate(firstDate.getDate() - dow0)

  // Advance end to the nearest Sunday
  const endSunday = new Date(lastDate)
  const dow1 = (lastDate.getDay() + 6) % 7
  endSunday.setDate(lastDate.getDate() + (6 - dow1))

  const weeks: WeekGrid[] = []
  const current = new Date(startMonday)
  let weekNum = 1

  while (current <= endSunday) {
    const days: (DailySpendingEntry | undefined)[] = []
    for (let d = 0; d < 7; d++) {
      const iso = current.toISOString().slice(0, 10)
      days.push(byDate.get(iso))
      current.setDate(current.getDate() + 1)
    }
    weeks.push({ weekLabel: `W${weekNum}`, days })
    weekNum++
  }

  return weeks
}
