const pulseClass = 'bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse'

interface PageSkeletonProps {
  variant: 'list' | 'cards' | 'chart'
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <div className={`${pulseClass} h-8 w-48`} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`${pulseClass} h-16 w-full`} />
      ))}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="space-y-3">
      <div className={`${pulseClass} h-8 w-48`} />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${pulseClass} h-32`} />
        ))}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className={`${pulseClass} h-8 w-48`} />
      <div className={`${pulseClass} h-64 w-full`} />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${pulseClass} h-20`} />
        ))}
      </div>
    </div>
  )
}

const VARIANT_MAP = {
  list: ListSkeleton,
  cards: CardsSkeleton,
  chart: ChartSkeleton,
} as const

export function PageSkeleton({ variant }: PageSkeletonProps) {
  const Component = VARIANT_MAP[variant]
  return <Component />
}
