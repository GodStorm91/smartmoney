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
          'bg-income-100 text-income-600 dark:bg-income-900/40 dark:text-income-300': variant === 'success',
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400': variant === 'warning',
          'bg-expense-100 text-expense-600 dark:bg-expense-900/40 dark:text-expense-300': variant === 'error',
          'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300': variant === 'info',
          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
