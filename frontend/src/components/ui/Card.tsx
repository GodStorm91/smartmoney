import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  role?: string
  'aria-label'?: string
  onClick?: () => void
}

export function Card({ children, className, hover = false, onClick, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm',
        hover && 'card-hover',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
