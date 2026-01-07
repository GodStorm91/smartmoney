import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center px-4',
      compact ? 'py-6' : 'py-12',
      className
    )}>
      {icon && (
        <div className={cn(
          'flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800',
          compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
        )}>
          <div className={cn(
            'text-gray-400 dark:text-gray-500',
            compact ? '[&>svg]:w-6 [&>svg]:h-6' : '[&>svg]:w-8 [&>svg]:h-8'
          )}>
            {icon}
          </div>
        </div>
      )}
      <h3 className={cn(
        'font-medium text-gray-700 dark:text-gray-300 text-center',
        compact ? 'text-sm mb-1' : 'text-lg mb-2'
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'text-gray-500 dark:text-gray-400 text-center max-w-sm',
          compact ? 'text-xs mb-3' : 'text-sm mb-4'
        )}>
          {description}
        </p>
      )}
      {action && <div className={compact ? 'mt-1' : 'mt-2'}>{action}</div>}
    </div>
  )
}
