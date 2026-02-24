import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  hover?: boolean
  variant?: 'default' | 'glass' | 'gradient' | 'elevated'
  role?: string
  'aria-label'?: string
  onClick?: () => void
}

export function Card({ children, className, style, hover = false, variant = 'default', onClick, ...props }: CardProps) {
  return (
    <div
      style={style}
      className={cn(
        'rounded-xl border transition-all duration-200 p-4 sm:p-5',
        // Variants
        variant === 'default' && 'bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700/80 shadow-card',
        variant === 'glass' && 'bg-white/90 dark:bg-gray-800/88 backdrop-blur-md border-white/30 dark:border-gray-700/50 shadow-card',
        variant === 'gradient' && 'bg-gradient-to-br from-white to-primary-50/30 dark:from-gray-800 dark:to-primary-900/10 border-gray-200/50 dark:border-gray-700/50 shadow-card',
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

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('', className)}>{children}</div>
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
  as?: 'h2' | 'h3' | 'h4' | 'h5'
}

export function CardTitle({ children, className, as: Tag = 'h3' }: CardTitleProps) {
  return <Tag className={cn('text-lg font-semibold', className)}>{children}</Tag>
}
