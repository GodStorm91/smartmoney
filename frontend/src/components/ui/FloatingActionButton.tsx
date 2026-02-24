import { useState } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus, X, Receipt, Upload, CreditCard, ShoppingCart } from 'lucide-react'
import { ProxyCartWizard } from '@/components/proxy/ProxyCartWizard'
import { cn } from '@/utils/cn'

interface FABAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: string
}

interface FloatingActionButtonProps {
  onAddTransaction?: () => void
}

// Pages that have their own FAB - don't show global FAB on these
const PAGES_WITH_OWN_FAB = ['/transactions']

export function FloatingActionButton({ onAddTransaction }: FloatingActionButtonProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showProxyWizard, setShowProxyWizard] = useState(false)

  // Hide on pages that have their own FAB
  if (PAGES_WITH_OWN_FAB.includes(location.pathname)) {
    return null
  }

  const actions: FABAction[] = [
    {
      icon: <CreditCard size={20} />,
      label: t('transaction.addTransaction', 'Add Transaction'),
      onClick: () => {
        setIsOpen(false)
        if (onAddTransaction) {
          onAddTransaction()
        } else {
          navigate({ to: '/transactions', search: { action: 'add-transaction' } })
        }
      },
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      icon: <Receipt size={20} />,
      label: t('receipt.scanReceipt', 'Scan Receipt'),
      onClick: () => {
        setIsOpen(false)
        navigate({ to: '/transactions', search: { action: 'scan-receipt' } })
      },
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      icon: <Upload size={20} />,
      label: t('header.upload', 'Upload CSV'),
      onClick: () => {
        setIsOpen(false)
        navigate({ to: '/upload' })
      },
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      icon: <ShoppingCart size={20} />,
      label: t('proxy.title', 'Proxy Purchase'),
      onClick: () => {
        setIsOpen(false)
        setShowProxyWizard(true)
      },
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[101] md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container - only on mobile */}
      <div className="fixed bottom-20 right-4 z-[102] md:hidden flex flex-col-reverse items-end gap-3">
        {/* Action Buttons */}
        {isOpen && (
          <div className="flex flex-col-reverse gap-3 mb-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={cn(
                  'flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg',
                  'animate-fab-item',
                  action.color
                )}
                style={{
                  '--fab-index': index,
                } as React.CSSProperties}
              >
                {action.icon}
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg flex items-center justify-center',
            'transform transition-all duration-300',
            'active:scale-95',
            isOpen
              ? 'bg-gray-700 dark:bg-gray-600 rotate-45'
              : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
          )}
          aria-label={isOpen ? t('close', 'Close') : t('fab.quickActions', 'Quick Actions')}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={24} className="text-white" />
          )}
        </button>
      </div>

      {/* Proxy Cart Wizard */}
      <ProxyCartWizard
        isOpen={showProxyWizard}
        onClose={() => setShowProxyWizard(false)}
      />
    </>
  )
}
