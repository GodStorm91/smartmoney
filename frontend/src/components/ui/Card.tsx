import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  variant?: 'default' | 'glass' | 'gradient' | 'elevated'
  role?: string
  'aria-label'?: string
  onClick?: () => void
}

export function Card({ children, className, hover = false, variant = 'default', onClick, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 p-4 sm:p-5',
        // Variants
        variant === 'default' && 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm',
        variant === 'glass' && 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 dark:border-gray-700/50 shadow-sm',
        variant === 'gradient' && 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200/50 dark:border-gray-700/50 shadow-sm',
        variant === 'elevated' && 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg',
        // Hover
        hover && 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
