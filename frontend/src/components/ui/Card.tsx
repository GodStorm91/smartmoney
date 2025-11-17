import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  role?: string
  'aria-label'?: string
}

export function Card({ children, className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl p-6 border border-gray-200 shadow-sm',
        hover && 'card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
