import { cn } from '@/utils/cn'
import { Sparkles } from 'lucide-react'

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
      'flex flex-col items-center justify-center px-4 animate-fade-in',
      compact ? 'py-6' : 'py-12',
      className
    )}>
      {icon ? (
        <div className={cn(
          'flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800',
          compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
        )}>
          <div className={cn(
            'text-gray-400 dark:text-gray-500',
            compact ? '[&>svg]:w-6 [&>svg]:h-6' : '[&>svg]:w-8 [&>svg]:h-8'
          )}>
            {icon}
          </div>
        </div>
      ) : (
        <div className={cn(
          'flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800',
          compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
        )}>
          <Sparkles className={cn(
            'text-gray-400 dark:text-gray-500',
            compact ? 'w-6 h-6' : 'w-8 h-8'
          )} />
        </div>
      )}
      <h3 className={cn(
        'font-semibold text-gray-700 dark:text-gray-300 text-center',
        compact ? 'text-sm mb-1.5' : 'text-base mb-2'
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'text-gray-500 dark:text-gray-400 text-center max-w-sm',
          compact ? 'text-xs mb-4' : 'text-sm mb-6'
        )}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
