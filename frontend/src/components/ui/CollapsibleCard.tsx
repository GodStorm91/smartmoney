import { useState, ReactNode } from 'react'
import { Card } from './Card'

interface CollapsibleCardProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  badge?: string | number
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
  badge
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronIcon isOpen={isOpen} />
      </button>

      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'mt-6 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        {children}
      </div>
    </Card>
  )
}
