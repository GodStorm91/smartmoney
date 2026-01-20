import { cn } from '@/utils/cn'

interface ProjectionProgressBarProps {
  spent: number
  projected: number
  budget: number
  className?: string
}

export function ProjectionProgressBar({
  spent,
  projected,
  budget,
  className
}: ProjectionProgressBarProps) {
  // Calculate percentages (cap at 100% for display)
  const spentPercent = Math.min(100, (spent / budget) * 100)
  const projectedPercent = Math.min(100, (projected / budget) * 100)
  const projectionWidth = Math.max(0, projectedPercent - spentPercent)

  // Determine colors based on status
  const getStatusColor = () => {
    if (projectedPercent > 100) return 'bg-red-500'
    if (projectedPercent > 90) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className={cn('relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', className)}>
      {/* Spent portion (solid) */}
      <div
        className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500"
        style={{ width: `${spentPercent}%` }}
      />

      {/* Projected extension (lighter, with border) */}
      {projectionWidth > 0 && (
        <div
          className={cn(
            'absolute top-0 h-full border-l-2 border-white/50',
            getStatusColor(),
            'transition-all duration-500'
          )}
          style={{ width: `${projectionWidth}%` }}
        />
      )}

      {/* Budget marker at 100% */}
      <div
        className="absolute top-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500"
        style={{ left: '100%' }}
      />
    </div>
  )
}
