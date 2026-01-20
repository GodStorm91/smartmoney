import { cn } from '@/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
        {
          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300': variant === 'default',
          'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400': variant === 'success',
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400': variant === 'warning',
          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400': variant === 'error',
          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400': variant === 'info',
          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
