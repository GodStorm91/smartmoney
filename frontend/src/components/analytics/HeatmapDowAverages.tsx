/**
 * Day-of-week average bar chart shown alongside the heatmap legend.
 * Each row is a horizontal mini-bar scaled relative to the highest daily average.
 */
import { useTranslation } from 'react-i18next'

interface Props {
  /** "0"–"6" → JPY average (0 = Monday, 6 = Sunday) */
  dowAvg: Record<string, number>
}

function DowBar({ label, avg, maxAvg }: { label: string; avg: number; maxAvg: number }) {
  const pct = maxAvg > 0 ? Math.round((avg / maxAvg) * 100) : 0
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="w-7 text-right text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-expense-300 dark:bg-expense-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function HeatmapDowAverages({ dowAvg }: Props) {
  const { t } = useTranslation('common')
  const weekdays: string[] = t('heatmap.weekdays', { returnObjects: true }) as string[]
  const maxAvg = Math.max(...Object.values(dowAvg), 0)

  return (
    <div className="flex-1 space-y-1">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {t('heatmap.dailyAvg')}
      </p>
      {weekdays.map((label, i) => (
        <DowBar key={i} label={label} avg={dowAvg[String(i)] ?? 0} maxAvg={maxAvg} />
      ))}
    </div>
  )
}
