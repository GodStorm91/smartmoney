import { useState, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

interface CollapsibleCardProps {
  title: string
  children: ReactNode
  badge?: number | string
  defaultOpen?: boolean
  defaultExpanded?: boolean
  headerAction?: ReactNode
  className?: string
  contentClassName?: string
}

export function CollapsibleCard({
  title,
  children,
  badge,
  defaultOpen,
  defaultExpanded,
  headerAction,
  className,
  contentClassName,
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen ?? defaultExpanded ?? true)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {badge !== undefined && (
            <span className="px-2.5 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerAction && (
            <div onClick={e => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          <ChevronDown
            size={20}
            className={cn(
              'text-gray-400 transition-transform duration-300',
              isExpanded ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className={cn('pt-4', contentClassName)}>
            {children}
          </div>
        </div>
      </div>
    </Card>
  )
}
