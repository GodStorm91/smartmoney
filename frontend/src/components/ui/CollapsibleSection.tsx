import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/cn'

interface CollapsibleSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-4 sm:p-6 text-left transition-colors',
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          isOpen && 'border-b border-gray-200 dark:border-gray-700'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
              {icon}
            </span>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          {badge}
        </div>
        <span className="flex-shrink-0 ml-3 text-gray-400 dark:text-gray-500">
          {isOpen ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </span>
      </button>

      {/* Content - collapsible */}
      <div
        className={cn(
          'transition-all duration-200 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="p-4 sm:p-6 pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}
