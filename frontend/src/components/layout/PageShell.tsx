import { cn } from '@/utils/cn'

const MAX_WIDTH_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
} as const

interface PageShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  headerRight?: React.ReactNode
  maxWidth?: keyof typeof MAX_WIDTH_MAP
  isLoading?: boolean
  skeleton?: React.ReactNode
  className?: string
}

export function PageShell({
  children,
  title,
  subtitle,
  headerRight,
  maxWidth = '2xl',
  isLoading,
  skeleton,
  className,
}: PageShellProps) {
  return (
    <div className={cn('pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-6', className)}>
      {title && (
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
          <div className={cn(MAX_WIDTH_MAP[maxWidth], 'mx-auto px-4 py-4')}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                )}
              </div>
              {headerRight && <div className="flex-shrink-0">{headerRight}</div>}
            </div>
          </div>
        </div>
      )}

      {isLoading && skeleton ? (
        <div className={cn(MAX_WIDTH_MAP[maxWidth], 'mx-auto px-4 py-4 sm:py-6')}>
          {skeleton}
        </div>
      ) : (
        <div className={cn(MAX_WIDTH_MAP[maxWidth], 'mx-auto px-4 py-4 sm:py-6 animate-fade-in')}>
          {children}
        </div>
      )}
    </div>
  )
}
