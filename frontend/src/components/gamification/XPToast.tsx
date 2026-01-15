import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface XPGainData {
  amount: number
  source: string
  timestamp: number
}

interface XPToastContextType {
  addXPGain: (amount: number, source: string) => void
  toasts: XPGainData[]
  dismissToast: (timestamp: number) => void
}

const XPToastContext = createContext<XPToastContextType | undefined>(undefined)

export function useXPToast() {
  const context = useContext(XPToastContext)
  if (!context) {
    throw new Error('useXPToast must be used within an XPToastProvider')
  }
  return context
}

export function XPToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<XPGainData[]>([])

  const addXPGain = useCallback((amount: number, source: string) => {
    const newToast: XPGainData = {
      amount,
      source,
      timestamp: Date.now(),
    }
    setToasts(prev => [...prev.slice(-2), newToast]) // Keep max 3 toasts

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.timestamp !== newToast.timestamp))
    }, 3000)
  }, [])

  const dismissToast = useCallback((timestamp: number) => {
    setToasts(prev => prev.filter(t => t.timestamp !== timestamp))
  }, [])

  return (
    <XPToastContext.Provider value={{ addXPGain, toasts, dismissToast }}>
      {children}
      <XPToastContainer toasts={toasts} onDismiss={dismissToast} />
    </XPToastContext.Provider>
  )
}

interface XPToastContainerProps {
  toasts: XPGainData[]
  onDismiss: (timestamp: number) => void
}

function XPToastContainer({ toasts, onDismiss }: XPToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <XPToastItem key={toast.timestamp} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function XPToastItem({ toast, onDismiss }: { toast: XPGainData; onDismiss: (timestamp: number) => void }) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg',
        'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/90 dark:to-orange-950/90',
        'border border-amber-200/50 dark:border-amber-800/50',
        'animate-in slide-in-from-bottom-5 fade-in duration-300'
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          +{toast.amount} XP
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
          {toast.source}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.timestamp)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors"
      >
        <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </button>
    </div>
  )
}

// Convenience function for triggering XP gain toast
export function triggerXPGain(amount: number, source: string) {
  // This would typically be called through the context
  // For now, components can use the useXPToast hook
  console.log(`[XP Gain] +${amount} XP from ${source}`)
}

export default XPToastProvider
