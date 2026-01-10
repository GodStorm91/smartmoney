import { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
}: ResponsiveModalProps) {
  const isMobile = useMediaQuery('(max-width: 1023px)')

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  // Mobile: Bottom Sheet
  if (isMobile) {
    const bottomSheetContent = (
      <div
        className="fixed inset-0 z-[100001] overflow-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-fade-in"
          onClick={onClose}
        />

        {/* Bottom Sheet */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900',
            'rounded-t-2xl shadow-xl max-h-[90vh] overflow-hidden',
            'animate-slide-up',
            className
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
            {children}
          </div>
        </div>
      </div>
    )

    if (typeof document === 'undefined') return null
    return createPortal(bottomSheetContent, document.body)
  }

  // Desktop: Centered Modal
  const desktopModalContent = (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full',
          'animate-modal-in max-h-[90vh] overflow-hidden',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
          {children}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(desktopModalContent, document.body)
}
