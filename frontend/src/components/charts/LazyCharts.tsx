import { lazy, Suspense, Component, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

// Error boundary to catch chart rendering errors
class ChartErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
          Chart failed to load
        </div>
      )
    }
    return this.props.children
  }
}

// Lazy load chart components to defer Recharts bundle
const LazyTrendLineChart = lazy(() => import('./TrendLineChart').then(m => ({ default: m.TrendLineChart })))
const LazyZoomableChart = lazy(() => import('./ZoomableChart').then(m => ({ default: m.ZoomableChart })))
const LazyIncomeExpenseBarChart = lazy(() => import('./IncomeExpenseBarChart').then(m => ({ default: m.IncomeExpenseBarChart })))
const LazyCategoryBarChart = lazy(() => import('./CategoryBarChart').then(m => ({ default: m.CategoryBarChart })))
const LazyCategoryPieChart = lazy(() => import('./CategoryPieChart').then(m => ({ default: m.CategoryPieChart })))
const LazyCashFlowSummary = lazy(() => import('./CashFlowSummary').then(m => ({ default: m.CashFlowSummary })))
const LazyForecastChart = lazy(() => import('./ForecastChart').then(m => ({ default: m.ForecastChart })))

// Chart loading skeleton
function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`${height} flex items-center justify-center`}>
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  )
}

// Wrapped components with Suspense
export function TrendLineChartLazy(props: React.ComponentProps<typeof LazyTrendLineChart>) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyTrendLineChart {...props} />
    </Suspense>
  )
}

export function ZoomableChartLazy(props: React.ComponentProps<typeof LazyZoomableChart>) {
  return (
    <Suspense fallback={<ChartSkeleton height="h-80" />}>
      <LazyZoomableChart {...props} />
    </Suspense>
  )
}

export function IncomeExpenseBarChartLazy(props: React.ComponentProps<typeof LazyIncomeExpenseBarChart>) {
  return (
    <Suspense fallback={<ChartSkeleton height="h-80" />}>
      <LazyIncomeExpenseBarChart {...props} />
    </Suspense>
  )
}

export function CategoryBarChartLazy(props: React.ComponentProps<typeof LazyCategoryBarChart>) {
  return (
    <Suspense fallback={<ChartSkeleton height="h-80" />}>
      <LazyCategoryBarChart {...props} />
    </Suspense>
  )
}

export function CategoryPieChartLazy(props: React.ComponentProps<typeof LazyCategoryPieChart>) {
  return (
    <Suspense fallback={<ChartSkeleton height="h-80" />}>
      <LazyCategoryPieChart {...props} />
    </Suspense>
  )
}

export function CashFlowSummaryLazy(props: React.ComponentProps<typeof LazyCashFlowSummary>) {
  return (
    <Suspense fallback={<ChartSkeleton height="h-32" />}>
      <LazyCashFlowSummary {...props} />
    </Suspense>
  )
}

export function ForecastChartLazy(props: React.ComponentProps<typeof LazyForecastChart>) {
  return (
    <ChartErrorBoundary>
      <Suspense fallback={<ChartSkeleton height="h-80" />}>
        <LazyForecastChart {...props} />
      </Suspense>
    </ChartErrorBoundary>
  )
}
