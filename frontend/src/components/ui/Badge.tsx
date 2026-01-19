import { cn } from '@/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
        {
          'bg-gray-100 text-gray-800': variant === 'default',
          'bg-green-50 text-green-800': variant === 'success',
          'bg-yellow-50 text-yellow-800': variant === 'warning',
          'bg-red-50 text-red-800': variant === 'error',
          'bg-blue-50 text-blue-800': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
