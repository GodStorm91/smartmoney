/**
 * Colour-scale legend strip shown below the heatmap grid.
 */
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { tierClasses } from './heatmap-utils'
import type { HeatmapTier } from './heatmap-utils'

const TIERS: HeatmapTier[] = [0, 1, 2, 3, 4, 5]

export function HeatmapLegend() {
  const { t } = useTranslation('common')
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span>{t('heatmap.less', 'Less')}</span>
      {TIERS.map((tier) => (
        <span
          key={tier}
          className={cn('w-3 h-3 rounded-sm', tierClasses(tier))}
        />
      ))}
      <span>{t('heatmap.more', 'More')}</span>
    </div>
  )
}
