import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
        className
      )}
    />
  )
}

// Pre-built skeleton components for common use cases
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton className="w-24 h-4 mb-2" />
      <Skeleton className="w-32 h-8" />
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><Skeleton className="w-20 h-4" /></td>
      <td className="px-6 py-4"><Skeleton className="w-32 h-4" /></td>
      <td className="px-6 py-4"><Skeleton className="w-16 h-6 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="w-24 h-4" /></td>
      <td className="px-6 py-4"><Skeleton className="w-20 h-4 ml-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="w-16 h-6 mx-auto" /></td>
    </tr>
  )
}

export function SkeletonTransactionCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="w-32 h-5 mb-2" />
          <Skeleton className="w-20 h-4" />
        </div>
        <Skeleton className="w-24 h-6" />
      </div>
    </div>
  )
}
