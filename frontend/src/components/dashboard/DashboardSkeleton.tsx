import { Card } from '@/components/ui/Card'
import { SkeletonKPI, SkeletonNetWorth, SkeletonCategoryBreakdown, SkeletonGoalCard, Skeleton } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title Skeleton */}
      <div className="mb-8">
        <Skeleton className="w-40 h-8 mb-2" />
        <Skeleton className="w-56 h-5" />
      </div>

      {/* Net Worth Skeleton */}
      <SkeletonNetWorth className="mb-6" />

      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>

      {/* Chart and Actions Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <Card className="lg:col-span-2 h-80">
          <Skeleton className="w-32 h-5 mb-4" />
          <Skeleton className="w-full h-56" />
        </Card>
        <Card>
          <Skeleton className="w-28 h-5 mb-4" />
          <div className="space-y-3">
            <Skeleton className="w-full h-12 rounded-lg" />
            <Skeleton className="w-full h-12 rounded-lg" />
            <Skeleton className="w-full h-12 rounded-lg" />
          </div>
        </Card>
      </div>

      {/* Category & Goals Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Skeleton className="w-40 h-5 mb-6" />
          <SkeletonCategoryBreakdown />
        </Card>
        <Card>
          <Skeleton className="w-36 h-5 mb-6" />
          <div className="space-y-6">
            <SkeletonGoalCard />
            <SkeletonGoalCard />
          </div>
        </Card>
      </div>
    </div>
  )
}
