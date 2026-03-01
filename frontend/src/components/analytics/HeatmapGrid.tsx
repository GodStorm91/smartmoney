/**
 * CSS-grid cell matrix for the spending heatmap.
 * Renders week columns × day-of-week rows, emitting mouse events for tooltip.
 */
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { getTier, tierClasses } from './heatmap-utils'
import type { WeekGrid } from './heatmap-utils'
import type { DailySpendingEntry } from '@/types'

interface Props {
  weeks: WeekGrid[]
  maxAmount: number
  onCellEnter: (entry: DailySpendingEntry, e: React.MouseEvent) => void
  onCellLeave: () => void
}

export function HeatmapGrid({ weeks, maxAmount, onCellEnter, onCellLeave }: Props) {
  const { t } = useTranslation('common')
  const weekdays: string[] = t('heatmap.weekdays', { returnObjects: true }) as string[]

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `2rem repeat(${weeks.length}, 1.25rem)` }}
      >
        {/* Header row: week labels */}
        <div /> {/* top-left corner spacer */}
        {weeks.map((w) => (
          <div
            key={w.weekLabel}
            className="text-[9px] text-center text-gray-400 dark:text-gray-500 leading-none"
          >
            {w.weekLabel}
          </div>
        ))}

        {/* One row per day-of-week (Mon–Sun) */}
        {weekdays.map((dayLabel, dowIndex) => (
          <>
            <div
              key={`label-${dowIndex}`}
              className="text-[9px] text-right pr-1 text-gray-500 dark:text-gray-400 leading-5"
            >
              {dayLabel}
            </div>
            {weeks.map((w, wi) => {
              const entry = w.days[dowIndex]
              const tier = entry ? getTier(entry.amount, maxAmount) : 0
              return (
                <div
                  key={`cell-${wi}-${dowIndex}`}
                  className={cn(
                    'w-5 h-5 rounded-sm cursor-default transition-opacity hover:opacity-75',
                    tierClasses(tier)
                  )}
                  onMouseEnter={entry ? (e) => onCellEnter(entry, e) : undefined}
                  onMouseLeave={onCellLeave}
                />
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}
