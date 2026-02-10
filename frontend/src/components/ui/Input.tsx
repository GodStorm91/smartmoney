import { cn } from '@/utils/cn'
import { forwardRef } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, helperText, className, ...props }, ref) => {
    const showIcon = error || success

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
              'transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              error
                ? 'border-red-500 focus:ring-red-500'
                : success
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-primary-500',
              showIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {showIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {error ? (
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
              ) : success ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
              ) : null}
            </div>
          )}
        </div>
        {error && (
          <p id={props.id ? `${props.id}-error` : undefined} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400 animate-fade-in-down">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={props.id ? `${props.id}-helper` : undefined} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
