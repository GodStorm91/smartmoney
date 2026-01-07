import { cn } from '@/utils/cn'
import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
          'transition-all duration-150 focus-ring',
          // Press animation (scale down on active)
          'active:scale-[0.97] active:transition-none',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          // Variants
          {
            'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow': variant === 'primary',
            'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600': variant === 'secondary',
            'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800': variant === 'outline',
            'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow': variant === 'danger',
          },
          // Sizes
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-6 py-3': size === 'md',
            'px-8 py-4 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2
            className={cn(
              'animate-spin',
              size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
            )}
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
